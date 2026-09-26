import { MongoClient, GridFSBucket, ObjectId } from 'mongodb';
import { config } from './config.js';

const client = new MongoClient(config.mongoUri);

export const db = {
  /** @type {import('mongodb').Collection} */ years: null,
  /** @type {import('mongodb').Collection} */ days: null,
  /** @type {import('mongodb').Collection} */ recaps: null,
  /** @type {GridFSBucket} */ photos: null,
  /** @type {GridFSBucket} */ audio: null,
};

export async function connectDb() {
  await client.connect();
  const database = client.db(config.mongoDbName);

  db.years = database.collection('years');
  db.days = database.collection('days');
  db.recaps = database.collection('recaps');
  db.photos = new GridFSBucket(database, { bucketName: 'photos' });
  db.audio = new GridFSBucket(database, { bucketName: 'audio' });

  await Promise.all([
    db.years.createIndex({ deviceId: 1, year: 1 }, { unique: true }),
    db.days.createIndex({ deviceId: 1, date: 1 }, { unique: true }),
    db.recaps.createIndex({ deviceId: 1, period: 1, key: 1 }, { unique: true }),
    db.recaps.createIndex({ shareId: 1 }, { unique: true, sparse: true }),
    database.collection('photos.files').createIndex({ 'metadata.deviceId': 1, 'metadata.date': 1 }),
  ]);

  console.log(`Connected to MongoDB database "${config.mongoDbName}"`);
}

export async function closeDb() {
  await client.close();
}

/** Turns a string into an ObjectId, or returns null if it isn't a valid id. */
export function toObjectId(id) {
  return ObjectId.isValid(id) && String(new ObjectId(id)) === id ? new ObjectId(id) : null;
}

/** Reads a whole GridFS file into memory. Only use this for small files like resized photos. */
export async function readFileToBuffer(bucket, fileId) {
  const chunks = [];
  for await (const chunk of bucket.openDownloadStream(fileId)) chunks.push(chunk);
  return Buffer.concat(chunks);
}

/** Uploads a buffer to a GridFS bucket and returns the new file's id. */
export function uploadBuffer(bucket, filename, buffer, { contentType, metadata }) {
  return new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, { metadata: { ...metadata, contentType } });
    stream.on('error', reject);
    stream.on('finish', () => resolve(stream.id));
    stream.end(buffer);
  });
}

/** Streams a GridFS file to an HTTP response with caching headers. */
export async function streamFile(bucket, fileId, res) {
  const [file] = await bucket.find({ _id: fileId }).limit(1).toArray();
  if (!file) {
    res.status(404).json({ error: 'File not found.' });
    return;
  }
  res.set('Content-Type', file.metadata?.contentType || 'application/octet-stream');
  res.set('Content-Length', String(file.length));
  res.set('Cache-Control', 'private, max-age=31536000, immutable');
  bucket.openDownloadStream(fileId).on('error', () => res.end()).pipe(res);
}