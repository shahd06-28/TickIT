import { Router } from 'express';
import { randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { db, streamFile, toObjectId } from '../db.js';
import { HttpError, checkMonth, checkYear } from '../validate.js';
import { buildRecap } from '../services/recapBuilder.js';

export const recapsRouter = Router();

/** Shapes a stored recap into what the app receives. */
function toRecapResponse(doc) {
  const id = String(doc._id);
  return {
    id,
    period: doc.period,
    key: doc.key,
    label: doc.label ?? doc.key,
    status: doc.status, // "generating", "ready", or "failed"
    error: doc.status === 'failed' ? doc.error : undefined,
    story: doc.story ?? null,
    stats: doc.stats ?? null,
    audioUrl: doc.audioFileId ? `/recaps/${id}/audio` : null,
    isPublic: Boolean(doc.isPublic),
    shareUrl: doc.isPublic && doc.shareId ? `${config.publicUrl}/r/${doc.shareId}` : null,
    generatedAt: doc.generatedAt ?? null,
  };
}

async function findOwnedRecap(deviceId, id) {
  const _id = toObjectId(id);
  if (!_id) throw new HttpError(400, `"${id}" isn't a valid recap id.`);
  const doc = await db.recaps.findOne({ _id, deviceId });
  if (!doc) throw new HttpError(404, 'Recap not found.');
  return doc;
}

async function findByPeriod(deviceId, period, key) {
  const doc = await db.recaps.findOne({ deviceId, period, key });
  if (!doc) throw new HttpError(404, `No recap for ${key} yet. Create one with POST.`);
  return doc;
}

// List every recap for this device, newest first. Good for a "past recaps" shelf.
recapsRouter.get('/', async (req, res) => {
  const docs = await db.recaps.find({ deviceId: req.deviceId }).sort({ key: -1 }).toArray();
  res.json({ recaps: docs.map(toRecapResponse) });
});

// Create a recap (or get the saved one). Takes 10-30 seconds the first time,
// so show a loading animation. Body: { force: true } to write a fresh one.
recapsRouter.post('/month/:month', async (req, res) => {
  const key = checkMonth(req.params.month);
  const doc = await buildRecap({ deviceId: req.deviceId, period: 'month', key, force: req.body?.force === true });
  res.json(toRecapResponse(doc));
});

recapsRouter.post('/year/:year', async (req, res) => {
  const key = checkYear(req.params.year);
  const doc = await buildRecap({ deviceId: req.deviceId, period: 'year', key, force: req.body?.force === true });
  res.json(toRecapResponse(doc));
});

// Get a recap without creating one. 404 means it hasn't been made yet.
recapsRouter.get('/month/:month', async (req, res) => {
  res.json(toRecapResponse(await findByPeriod(req.deviceId, 'month', checkMonth(req.params.month))));
});

recapsRouter.get('/year/:year', async (req, res) => {
  res.json(toRecapResponse(await findByPeriod(req.deviceId, 'year', checkYear(req.params.year))));
});

// The narration MP3. Play it in the app with expo-audio.
recapsRouter.get('/:id/audio', async (req, res) => {
  const doc = await findOwnedRecap(req.deviceId, req.params.id);
  if (!doc.audioFileId) throw new HttpError(404, 'This recap has no narration.');
  await streamFile(db.audio, doc.audioFileId, res);
});

// Turn sharing on. Returns the public link. Turning it off and on again keeps the same link.
recapsRouter.post('/:id/share', async (req, res) => {
  const doc = await findOwnedRecap(req.deviceId, req.params.id);
  if (doc.status !== 'ready') throw new HttpError(400, 'Only finished recaps can be shared.');

  const shareId = doc.shareId ?? randomBytes(9).toString('base64url');
  await db.recaps.updateOne({ _id: doc._id }, { $set: { shareId, isPublic: true, updatedAt: new Date() } });
  res.json(toRecapResponse({ ...doc, shareId, isPublic: true }));
});

// Turn sharing off. The link stops working immediately.
recapsRouter.delete('/:id/share', async (req, res) => {
  const doc = await findOwnedRecap(req.deviceId, req.params.id);
  await db.recaps.updateOne({ _id: doc._id }, { $set: { isPublic: false, updatedAt: new Date() } });
  res.json(toRecapResponse({ ...doc, isPublic: false }));
});