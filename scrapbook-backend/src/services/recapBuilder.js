import { config } from '../config.js';
import { db, readFileToBuffer, toObjectId, uploadBuffer } from '../db.js';
import { HttpError } from '../validate.js';
import { writeRecapStory } from './gemini.js';
import { hasElevenLabs, textToSpeech } from './elevenlabs.js';

// If a recap has been "generating" longer than this, assume it crashed and allow a retry.
const STALE_AFTER_MS = 3 * 60 * 1000;

/** "2026-09" -> "September 2026", "2026" -> "2026" */
export function periodLabel(period, key) {
  if (period === 'year') return key;
  const date = new Date(`${key}-01T00:00:00Z`);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Picks up to `max` items spread evenly across the list, keeping their order. */
export function pickEvenly(list, max) {
  if (list.length <= max) return list;
  if (max === 1) return [list[Math.floor(list.length / 2)]];
  const picked = [];
  for (let i = 0; i < max; i++) {
    picked.push(list[Math.round((i * (list.length - 1)) / (max - 1))]);
  }
  return picked;
}

/**
 * Creates (or returns an existing) recap.
 * @param {object} options
 * @param {string} options.deviceId
 * @param {'month'|'year'} options.period
 * @param {string} options.key   "2026-09" for a month, "2026" for a year
 * @param {boolean} [options.force]  true to write a fresh recap even if one exists
 */
export async function buildRecap({ deviceId, period, key, force = false }) {
  const filter = { deviceId, period, key };
  const existing = await db.recaps.findOne(filter);

  // Recaps are saved, so opening one again is instant and costs nothing.
  if (existing?.status === 'ready' && !force) return existing;

  // 1. Gather everything first, so an empty month fails before we lock anything.
  const input = await gatherInput(deviceId, period, key);

  // 2. Mark it as generating so a double-tap doesn't start two expensive AI calls.
  await claimRecap(filter);

  try {
    // 3. Load the chosen photos and ask Gemini for the story.
    const photos = await loadPhotos(input.chosenPhotos);
    const story = await writeRecapStory({ ...input, photos });

    // 4. Turn Gemini's photo numbers back into real photo ids.
    const pages = story.pages.map((page) => {
      const photo = photos[page.photoIndex];
      return { photoId: photo.id, date: photo.date, caption: page.caption };
    });

    // 5. Narration is a bonus: if ElevenLabs fails, the recap still saves without audio.
    const audioFileId = await makeNarration(story.narration, { deviceId, period, key });
    if (audioFileId && existing?.audioFileId) {
      await db.audio.delete(existing.audioFileId).catch(() => {});
    }

    await db.recaps.updateOne(filter, {
      $set: {
        status: 'ready',
        label: input.label,
        story: { ...story, pages },
        stats: input.stats,
        audioFileId: audioFileId ?? existing?.audioFileId ?? null,
        generatedAt: new Date(),
        updatedAt: new Date(),
      },
      $unset: { startedAt: '', error: '' },
    });

    return db.recaps.findOne(filter);
  } catch (err) {
    // Keep an older working version if there was one; otherwise mark it failed.
    await db.recaps.updateOne(filter, {
      $set: { status: existing?.story ? 'ready' : 'failed', error: err.message, updatedAt: new Date() },
      $unset: { startedAt: '' },
    });
    throw err;
  }
}

async function claimRecap(filter) {
  const staleBefore = new Date(Date.now() - STALE_AFTER_MS);
  try {
    await db.recaps.updateOne(
      { ...filter, $or: [{ status: { $ne: 'generating' } }, { startedAt: { $lt: staleBefore } }] },
      {
        $set: { status: 'generating', startedAt: new Date(), updatedAt: new Date() },
        $setOnInsert: { createdAt: new Date(), isPublic: false },
      },
      { upsert: true },
    );
  } catch (err) {
    // The filter didn't match because it's already generating, so MongoDB tried to
    // insert a duplicate and the unique index stopped it.
    if (err.code === 11000) {
      throw new HttpError(409, 'This recap is already being made. Check back in a few seconds.');
    }
    throw err;
  }
}

async function gatherInput(deviceId, period, key) {
  const label = periodLabel(period, key);
  const year = key.slice(0, 4);

  const [days, yearDoc] = await Promise.all([
    db.days.find({ deviceId, date: { $regex: `^${key}-` } }).sort({ date: 1 }).toArray(),
    db.years.findOne({ deviceId, year }),
  ]);

  const activeDays = days.filter((d) => d.tasks?.length || d.photos?.length || d.note);
  if (!activeDays.length) {
    throw new HttpError(400, `Nothing to recap for ${label} yet. Add some tasks or photos first.`);
  }

  const allPhotos = activeDays.flatMap((d) =>
    (d.photos ?? []).map((p) => ({ id: p.id, date: d.date, caption: p.caption ?? '' })),
  );
  const allTasks = activeDays.flatMap((d) => d.tasks ?? []);
  const doneTasks = allTasks.filter((t) => t.done).map((t) => t.title);

  let chosenPhotos;
  let monthTitles = [];

  if (period === 'month') {
    chosenPhotos = pickEvenly(allPhotos, config.maxPhotosPerMonthRecap);
  } else {
    // One photo from the middle of each month, so the whole year is represented.
    const byMonth = new Map();
    for (const photo of allPhotos) {
      const month = photo.date.slice(0, 7);
      if (!byMonth.has(month)) byMonth.set(month, []);
      byMonth.get(month).push(photo);
    }
    chosenPhotos = [...byMonth.values()]
      .map((monthPhotos) => monthPhotos[Math.floor(monthPhotos.length / 2)])
      .slice(0, config.maxPhotosPerYearRecap);

    const monthRecaps = await db.recaps
      .find({ deviceId, period: 'month', key: { $regex: `^${year}-` }, status: 'ready' })
      .sort({ key: 1 })
      .toArray();
    monthTitles = monthRecaps.map((r) => `${r.label}: ${r.story?.title}`);
  }

  return {
    period,
    label,
    moodBoard: yearDoc?.moodBoard ?? { words: [], intention: '' },
    stats: {
      daysJournaled: activeDays.length,
      tasksDone: doneTasks.length,
      tasksTotal: allTasks.length,
      photoCount: allPhotos.length,
    },
    doneTasks: pickEvenly(doneTasks, 60),
    notes: activeDays.filter((d) => d.note).map((d) => ({ date: d.date, note: d.note.slice(0, 300) })),
    chosenPhotos,
    monthTitles,
  };
}

/** Loads photo files from GridFS. Photos deleted since being chosen are skipped. */
async function loadPhotos(chosenPhotos) {
  const loaded = [];
  for (const photo of chosenPhotos) {
    const [file] = await db.photos.find({ _id: toObjectId(photo.id) }).limit(1).toArray();
    if (!file) continue;
    loaded.push({
      ...photo,
      mimeType: file.metadata?.contentType || 'image/jpeg',
      data: await readFileToBuffer(db.photos, file._id),
    });
  }
  return loaded;
}

async function makeNarration(text, { deviceId, period, key }) {
  if (!text || !hasElevenLabs()) return null;
  try {
    const mp3 = await textToSpeech(text);
    return await uploadBuffer(db.audio, `${period}-${key}.mp3`, mp3, {
      contentType: 'audio/mpeg',
      metadata: { deviceId, period, key },
    });
  } catch (err) {
    console.error('Narration failed, saving recap without audio:', err.message);
    return null;
  }
}