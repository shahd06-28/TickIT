import { Router } from 'express';
import { db, streamFile, toObjectId } from '../db.js';
import { HttpError } from '../validate.js';
import { renderNotFoundPage, renderRecapPage } from '../share/page.js';

export const shareRouter = Router();

const SHARE_ID = /^[A-Za-z0-9_-]{12}$/;

// Personal scrapbooks shouldn't show up in Google, and the page must always be
// checked fresh so turning sharing off works immediately.
shareRouter.use((_req, res, next) => {
  res.set('X-Robots-Tag', 'noindex, nofollow');
  res.set('Referrer-Policy', 'no-referrer');
  next();
});

/** Finds a recap only if its owner has sharing turned on. */
async function findSharedRecap(shareId) {
  if (!SHARE_ID.test(shareId)) return null;
  return db.recaps.findOne({ shareId, isPublic: true, status: 'ready' });
}

// The page itself: yourdomain.com/r/Xk3_pQ9aLm2B
shareRouter.get('/:shareId', async (req, res) => {
  const recap = await findSharedRecap(req.params.shareId);
  res.set('Cache-Control', 'no-store');
  res.type('html');
  if (!recap) {
    res.status(404).send(renderNotFoundPage());
    return;
  }
  res.send(renderRecapPage(recap));
});

// Photos on the page. Only photos that are actually in this recap can be loaded,
// so a share link can't be used to open the owner's other photos.
shareRouter.get('/:shareId/photos/:photoId', async (req, res) => {
  const recap = await findSharedRecap(req.params.shareId);
  const inRecap = recap?.story?.pages?.some((p) => p.photoId === req.params.photoId);
  const fileId = toObjectId(req.params.photoId);
  if (!recap || !inRecap || !fileId) throw new HttpError(404, 'Photo not found.');
  await streamFile(db.photos, fileId, res);
});

// The narration for the page's audio player.
shareRouter.get('/:shareId/audio', async (req, res) => {
  const recap = await findSharedRecap(req.params.shareId);
  if (!recap?.audioFileId) throw new HttpError(404, 'This recap has no narration.');
  await streamFile(db.audio, recap.audioFileId, res);
});