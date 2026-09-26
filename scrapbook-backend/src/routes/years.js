import { Router } from 'express';
import { db, toObjectId } from '../db.js';
import { HttpError, checkText, checkYear } from '../validate.js';

export const yearsRouter = Router();

// Get the mood board for a year. Returns an empty board if none exists yet,
// so the app can use this to decide whether to show the setup screen.
yearsRouter.get('/:year', async (req, res) => {
  const year = checkYear(req.params.year);
  const doc = await db.years.findOne({ deviceId: req.deviceId, year });
  res.json({
    year,
    hasMoodBoard: Boolean(doc),
    moodBoard: doc?.moodBoard ?? { words: [], intention: '', photoIds: [] },
  });
});

// Create or replace the mood board.
// Body: { words: ["calm", "travel"], intention: "Say yes more", photoIds: ["<photo id>", ...] }
// Upload mood board images first with POST /photos (date = any day in that year).
yearsRouter.put('/:year/moodboard', async (req, res) => {
  const year = checkYear(req.params.year);
  const { words = [], intention, photoIds = [] } = req.body ?? {};

  if (!Array.isArray(words) || words.length > 12) {
    throw new HttpError(400, '"words" must be a list of up to 12 words.');
  }
  if (!Array.isArray(photoIds) || photoIds.length > 12) {
    throw new HttpError(400, '"photoIds" must be a list of up to 12 photo ids.');
  }

  const cleanPhotoIds = photoIds.map((id) => {
    if (!toObjectId(id)) throw new HttpError(400, `"${id}" isn't a valid photo id.`);
    return id;
  });

  const moodBoard = {
    words: words.map((w, i) => checkText(w, `words[${i}]`, { max: 40 })),
    intention: checkText(intention, 'intention', { max: 280, optional: true }) ?? '',
    photoIds: cleanPhotoIds,
  };

  await db.years.updateOne(
    { deviceId: req.deviceId, year },
    { $set: { moodBoard, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
    { upsert: true },
  );

  res.json({ year, hasMoodBoard: true, moodBoard });
});