import express from 'express';
import cors from 'cors';
import { networkInterfaces } from 'node:os';
import { config } from './config.js';
import { connectDb, closeDb } from './db.js';
import { requireDevice, HttpError } from './validate.js';
import { yearsRouter } from './routes/years.js';
import { daysRouter, monthsRouter } from './routes/days.js';
import { photosRouter } from './routes/photos.js';
import { recapsRouter } from './routes/recaps.js';
import { shareRouter } from './routes/share.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Quick check that the server is up. Open /health in a browser to test.
app.get('/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

// Public share pages: anyone with the link can open these, no device ID needed.
app.use('/r', shareRouter);

// Everything below needs the X-Device-Id header.
app.use('/years', requireDevice, yearsRouter);
app.use('/days', requireDevice, daysRouter);
app.use('/months', requireDevice, monthsRouter);
app.use('/photos', requireDevice, photosRouter);
app.use('/recaps', requireDevice, recapsRouter);

// Any address that didn't match a route above.
app.use((req, _res, next) => {
  next(new HttpError(404, `No route for ${req.method} ${req.path}`));
});

// Turns every error into a JSON response the app can read.
app.use((err, _req, res, _next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'That photo is too big. Keep photos under 8 MB.' });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: "The request body isn't valid JSON." });
  }

  const status = Number.isInteger(err.status) ? err.status : 500;
  if (status >= 500) console.error(err);

  const message = err instanceof HttpError || status < 500 ? err.message : 'Something went wrong on the server.';
  res.status(status).json({ error: message });
});

/** Lists this computer's local network addresses so teammates can reach it from a phone. */
function localAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter((net) => net && net.family === 'IPv4' && !net.internal)
    .map((net) => `http://${net.address}:${config.port}`);
}

async function start() {
  await connectDb();

  const server = app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
    for (const address of localAddresses()) console.log(`On your Wi-Fi:   ${address}`);
  });

  // Close the database cleanly when you stop the server with Ctrl+C.
  const shutdown = () => {
    server.close(async () => {
      await closeDb();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Server failed to start:', err.message);
  process.exit(1);
});