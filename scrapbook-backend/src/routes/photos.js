import { Router } from 'express';
import multer from 'multer';
import { config } from '../config.js';
import { db, streamFile, toObjectId, uploadBuffer } from '../db.js';
import { HttpError, checkDate, checkText } from '../validate.js';

export const photosRouter = Router();

// Formats Gemini can read, so every stored photo can go into a recap.
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxPhotoBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.has(file.mimetype)) cb(null, true);
    else cb(new HttpError(400, 'Photos must be JPEG, PNG, WebP, or HEIC.'));
  },
});

async function findOwnedPhoto(deviceId, id) {
  const fileId = toObjectId(id);
  if (!fileId) throw new HttpError(400, `"${id}" isn't a valid photo id.`);
  const [file] = await db.photos.find({ _id: fileId, 'metadata.deviceId': deviceId }).limit(1).toArray();
  if (!file) throw new HttpError(404, 'Photo not found.');
  return file;
}

// Upload a photo as multipart form data.
// Fields: photo (the file), date (YYYY-MM-DD), caption (optional),
//         kind ("journal" to add it to that day's page, or "moodboard" to keep it off the calendar)
// Resize photos on the phone first (about 1080px wide) so uploads and AI recaps stay fast.
photosRouter.post('/', upload.single('photo'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'Attach the image in a form field named "photo".');
  const date = checkDate(req.body.date);
  const caption = checkText(req.body.caption, 'caption', { max: 200, optional: true }) ?? '';
  const kind = req.body.kind === 'moodboard' ? 'moodboard' : 'journal';

  const fileId = await uploadBuffer(db.photos, req.file.originalname || 'photo', req.file.buffer, {
    contentType: req.file.mimetype,
    metadata: { deviceId: req.deviceId, date, kind },
  });

  const photo = { id: String(fileId), caption, takenAt: new Date() };
  if (kind === 'journal') {
    await db.days.updateOne(
      { deviceId: req.deviceId, date },
      { $push: { photos: photo }, $set: { updatedAt: new Date() }, $setOnInsert: { tasks: [], note: '' } },
      { upsert: true },
    );
  }

  res.status(201).json({ ...photo, date, kind });
});

// Returns the image itself. Use it as an image source in the app, sending the
// X-Device-Id header, or add ?d=<deviceId> to the URL.
photosRouter.get('/:id', async (req, res) => {
  const file = await findOwnedPhoto(req.deviceId, req.params.id);
  await streamFile(db.photos, file._id, res);
});

// Change a photo's caption. Body: { caption: "Sunset at the beach" }
photosRouter.patch('/:id', async (req, res) => {
  const file = await findOwnedPhoto(req.deviceId, req.params.id);
  const caption = checkText(req.body?.caption ?? '', 'caption', { max: 200, optional: true }) ?? '';
  await db.days.updateOne(
    { deviceId: req.deviceId, date: file.metadata.date, 'photos.id': req.params.id },
    { $set: { 'photos.$.caption': caption, updatedAt: new Date() } },
  );
  res.json({ id: req.params.id, caption });
});

photosRouter.delete('/:id', async (req, res) => {
  const file = await findOwnedPhoto(req.deviceId, req.params.id);
  await db.photos.delete(file._id);
  await db.days.updateOne(
    { deviceId: req.deviceId, date: file.metadata.date },
    { $pull: { photos: { id: req.params.id } }, $set: { updatedAt: new Date() } },
  );
  res.json({ deleted: true });
});