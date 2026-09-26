// Fills the database with a realistic year of journal data for your demo.
//
//   npm run seed-demo                      seed data only
//   npm run seed-demo -- --recaps          seed data, then make every recap (needs GEMINI_API_KEY)
//   npm run seed-demo -- --dry-run         show the plan without touching the database
//
// Put demo photos in scrapbook-backend/demo-photos/ first. Start each name with its
// month number to place it (09-shellhacks.jpg goes in September); photos without a
// month number are spread across the year.
// Everything for the demo device is erased and rebuilt each run, so it's safe to rerun.

import { readdir, readFile, stat } from 'node:fs/promises';
import { extname } from 'node:path';
import { randomUUID } from 'node:crypto';

const args = new Set(process.argv.slice(2));
const DRY_RUN = args.has('--dry-run');
const MAKE_RECAPS = args.has('--recaps');

const DEVICE_ID = process.env.DEMO_DEVICE_ID || 'tickit-demo-device';
const PHOTO_DIR = new URL('../demo-photos/', import.meta.url);
const TYPES = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic' };

// The demo covers January through the current month.
const today = new Date();
const YEAR = String(today.getFullYear());
const LAST_MONTH = today.getMonth() + 1;

const MOOD_BOARD = {
  words: ['growth', 'sunshine', 'friends', 'balance', 'adventure'],
  intention: 'Say yes to new things and take care of myself along the way.',
  photoIds: [],
};

// Tasks that fit each month, mixed with everyday ones, so recaps have real material.
const MONTH_TASKS = {
  1: ['Set up my planner for the year', 'Join the campus gym', 'Buy textbooks'],
  2: ['Plan Valentine\'s picnic', 'Study for first midterm', 'Apply to summer internships'],
  3: ['Spring break packing list', 'Finish lab report', 'Beach day with the club'],
  4: ['Final project proposal', 'Farmers market run', 'Call grandma'],
  5: ['Finals week study plan', 'Move-out checklist', 'Celebrate end of semester'],
  6: ['First day at internship', 'Try a new coffee shop', 'Sunset run'],
  7: ['Fourth of July cookout', 'Read a book for fun', 'Weekend road trip'],
  8: ['Back-to-school shopping', 'Update resume', 'Set up dorm room'],
  9: ['First week of classes', 'Sign up for ShellHacks', 'Club fair'],
  10: ['Pick a Halloween costume', 'Midterm study group', 'Pumpkin patch trip'],
  11: ['Friendsgiving dinner', 'Book flights home', 'Start final projects'],
  12: ['Holiday gift list', 'Finals week', 'Year-end reflection'],
};
const EVERYDAY_TASKS = [
  'Morning walk', 'Grocery run', 'Laundry', 'Meal prep', 'Reply to emails', 'Gym session',
  'Read 20 pages', 'Clean my room', 'Water the plants', 'Journal before bed', 'Call a friend',
  'Study session at the library', 'Stretch for 10 minutes', 'Cook dinner', 'Pay bills',
];
const NOTES = [
  'Such a good day. The weather was perfect.',
  'Tired but proud of what I got done.',
  'Spent the evening with friends and laughed a lot.',
  'Slow day, and that was okay.',
  'Tried something new today and loved it.',
  'Felt really focused this morning.',
  'Long day, but the sunset made up for it.',
  'Grateful for the little things today.',
];

// A seeded random generator, so every run creates the same demo year.
function makeRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = makeRandom(2026);
const pick = (list) => list[Math.floor(random() * list.length)];
const pad = (n) => String(n).padStart(2, '0');

function daysInMonth(month) {
  return new Date(Date.UTC(Number(YEAR), month, 0)).getUTCDate();
}

async function loadPhotoFiles() {
  let names;
  try {
    names = await readdir(PHOTO_DIR);
  } catch {
    return [];
  }
  const files = [];
  for (const name of names.sort()) {
    const type = TYPES[extname(name).toLowerCase()];
    if (!type) continue;
    const path = new URL(name, PHOTO_DIR);
    const { size } = await stat(path);
    if (size > 8 * 1024 * 1024) {
      console.warn(`Skipping ${name}: over 8 MB. Resize it first.`);
      continue;
    }
    if (size > 2 * 1024 * 1024) {
      console.warn(`${name} is ${(size / 1024 / 1024).toFixed(1)} MB. Photos under 1 MB make recaps faster.`);
    }
    files.push({ name, path, type });
  }
  return files;
}

/** Plans which days get content and which photos go where. */
function planYear(photoFiles) {
  const days = new Map();
  const dayFor = (date) => {
    if (!days.has(date)) days.set(date, { date, tasks: [], photos: [], note: '' });
    return days.get(date);
  };

  for (let month = 1; month <= LAST_MONTH; month++) {
    const isCurrentMonth = month === LAST_MONTH;
    const lastDay = isCurrentMonth ? today.getDate() : daysInMonth(month);
    const activeDays = Math.min(lastDay, 7 + Math.floor(random() * 6));
    const chosen = new Set();
    while (chosen.size < activeDays) chosen.add(1 + Math.floor(random() * lastDay));

    const special = [...MONTH_TASKS[month]];
    for (const dayNumber of [...chosen].sort((a, b) => a - b)) {
      const day = dayFor(`${YEAR}-${pad(month)}-${pad(dayNumber)}`);
      const taskCount = 2 + Math.floor(random() * 3);
      for (let i = 0; i < taskCount; i++) {
        const title = special.length && random() < 0.5 ? special.shift() : pick(EVERYDAY_TASKS);
        const done = random() < 0.8;
        day.tasks.push({
          id: randomUUID(),
          title,
          time: null,
          done,
          doneAt: done ? new Date(`${day.date}T${pad(9 + i * 3)}:00:00Z`) : null,
        });
      }
      if (random() < 0.35) day.note = pick(NOTES);
    }
  }

  // Photos named like "09-shellhacks.jpg" go in that month (September). Others are
  // spread evenly across the year. Within a month, photos stay in file-name order.
  const byMonth = new Map();
  photoFiles.forEach((file, i) => {
    const named = file.name.match(/^(0[1-9]|1[0-2])[-_ ]/);
    const month = named
      ? Math.min(Number(named[1]), LAST_MONTH)
      : 1 + Math.floor((i * LAST_MONTH) / photoFiles.length);
    if (!byMonth.has(month)) byMonth.set(month, []);
    byMonth.get(month).push(file);
  });
  for (const [month, files] of byMonth) {
    const monthDays = [...days.values()].filter((d) => d.date.startsWith(`${YEAR}-${pad(month)}-`));
    const targets = files.map(() => monthDays[Math.floor(random() * monthDays.length)]);
    targets.sort((a, b) => a.date.localeCompare(b.date));
    files.forEach((file, i) => targets[i].photos.push({ file, caption: '' }));
  }

  return [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
}

async function clearDemoDevice(db) {
  const [photoFiles, audioFiles] = await Promise.all([
    db.photos.find({ 'metadata.deviceId': DEVICE_ID }).toArray(),
    db.audio.find({ 'metadata.deviceId': DEVICE_ID }).toArray(),
  ]);
  await Promise.all([
    ...photoFiles.map((f) => db.photos.delete(f._id)),
    ...audioFiles.map((f) => db.audio.delete(f._id)),
    db.days.deleteMany({ deviceId: DEVICE_ID }),
    db.years.deleteMany({ deviceId: DEVICE_ID }),
    db.recaps.deleteMany({ deviceId: DEVICE_ID }),
  ]);
}

async function main() {
  const photoFiles = await loadPhotoFiles();
  const plan = planYear(photoFiles);
  const taskCount = plan.reduce((n, d) => n + d.tasks.length, 0);

  console.log(`Demo device: ${DEVICE_ID}`);
  console.log(`Planned ${plan.length} days from January to ${YEAR}-${pad(LAST_MONTH)}, ${taskCount} tasks, ${photoFiles.length} photos.`);
  if (!photoFiles.length) console.log('No photos found in demo-photos/. Recaps will still work, just without pictures.');

  if (DRY_RUN) {
    for (let month = 1; month <= LAST_MONTH; month++) {
      const monthDays = plan.filter((d) => d.date.startsWith(`${YEAR}-${pad(month)}-`));
      const photos = monthDays.flatMap((d) => d.photos.map((p) => p.file.name));
      console.log(`  ${YEAR}-${pad(month)}: ${monthDays.length} days${photos.length ? `, photos: ${photos.join(', ')}` : ''}`);
    }
    console.log('Dry run only. Nothing was saved.');
    return;
  }

  // Loaded here so --dry-run works without a database connection.
  const { connectDb, closeDb, db, uploadBuffer } = await import('../src/db.js');
  await connectDb();

  try {
    console.log('Clearing old demo data...');
    await clearDemoDevice(db);

    console.log('Uploading photos and saving days...');
    for (const day of plan) {
      const photos = [];
      for (const { file, caption } of day.photos) {
        const id = await uploadBuffer(db.photos, file.name, await readFile(file.path), {
          contentType: file.type,
          metadata: { deviceId: DEVICE_ID, date: day.date, kind: 'journal' },
        });
        photos.push({ id: String(id), caption, takenAt: new Date(`${day.date}T18:00:00Z`) });
      }
      await db.days.insertOne({
        deviceId: DEVICE_ID,
        date: day.date,
        tasks: day.tasks,
        photos,
        note: day.note,
        updatedAt: new Date(),
      });
    }

    await db.years.insertOne({
      deviceId: DEVICE_ID,
      year: YEAR,
      moodBoard: MOOD_BOARD,
      createdAt: new Date(`${YEAR}-01-01T12:00:00Z`),
      updatedAt: new Date(),
    });
    console.log('Demo data saved.');

    if (MAKE_RECAPS) {
      const { buildRecap } = await import('../src/services/recapBuilder.js');
      // Months first, so the year recap can mention their titles.
      for (let month = 1; month <= LAST_MONTH; month++) {
        const key = `${YEAR}-${pad(month)}`;
        process.stdout.write(`Making recap for ${key}... `);
        try {
          const recap = await buildRecap({ deviceId: DEVICE_ID, period: 'month', key });
          console.log(`"${recap.story.title}"${recap.audioFileId ? ' with narration' : ''}`);
        } catch (err) {
          console.log(`failed: ${err.message}`);
        }
      }
      process.stdout.write(`Making year recap for ${YEAR}... `);
      try {
        const recap = await buildRecap({ deviceId: DEVICE_ID, period: 'year', key: YEAR });
        console.log(`"${recap.story.title}"${recap.audioFileId ? ' with narration' : ''}`);
      } catch (err) {
        console.log(`failed: ${err.message}`);
      }
    } else {
      console.log('Run again with --recaps to make the AI recaps too.');
    }

    console.log(`\nDone. In the app, use device ID "${DEVICE_ID}" to see the demo year.`);
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error('Seeding failed:', err.message);
  process.exit(1);
});