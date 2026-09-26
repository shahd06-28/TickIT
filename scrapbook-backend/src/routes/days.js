import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { db } from '../db.js';
import { HttpError, checkDate, checkMonth, checkText } from '../validate.js';

export const daysRouter = Router();
export const monthsRouter = Router();

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Shapes a stored day into what the app receives. Missing days come back empty. */
function toDayResponse(date, doc) {
  const tasks = doc?.tasks ?? [];
  const done = tasks.filter((t) => t.done).length;
  return {
    date,
    note: doc?.note ?? '',
    tasks,
    photos: doc?.photos ?? [],
    // 0 to 1. The app uses this to place the character along today's path.
    progress: tasks.length ? done / tasks.length : 0,
  };
}

async function loadDay(deviceId, date) {
  return db.days.findOne({ deviceId, date });
}

// Get one day. Always succeeds, even for days with nothing in them yet.
daysRouter.get('/:date', async (req, res) => {
  const date = checkDate(req.params.date);
  res.json(toDayResponse(date, await loadDay(req.deviceId, date)));
});

// Add a task. Body: { title: "Study for exam", time?: "14:30" }
daysRouter.post('/:date/tasks', async (req, res) => {
  const date = checkDate(req.params.date);
  const title = checkText(req.body?.title, 'title', { max: 120 });
  const time = req.body?.time;
  if (time !== undefined && time !== null && !TIME.test(time)) {
    throw new HttpError(400, '"time" must look like 14:30.');
  }

  const task = { id: randomUUID(), title, time: time ?? null, done: false, doneAt: null };
  await db.days.updateOne(
    { deviceId: req.deviceId, date },
    { $push: { tasks: task }, $set: { updatedAt: new Date() }, $setOnInsert: { photos: [], note: '' } },
    { upsert: true },
  );

  res.status(201).json(toDayResponse(date, await loadDay(req.deviceId, date)));
});

// Update a task. Body can include { title, time, done }. Send { done: true } to check it off.
daysRouter.patch('/:date/tasks/:taskId', async (req, res) => {
  const date = checkDate(req.params.date);
  const { title, time, done } = req.body ?? {};
  const changes = {};

  if (title !== undefined) changes['tasks.$.title'] = checkText(title, 'title', { max: 120 });
  if (time !== undefined) {
    if (time !== null && !TIME.test(time)) throw new HttpError(400, '"time" must look like 14:30.');
    changes['tasks.$.time'] = time;
  }
  if (done !== undefined) {
    if (typeof done !== 'boolean') throw new HttpError(400, '"done" must be true or false.');
    changes['tasks.$.done'] = done;
    changes['tasks.$.doneAt'] = done ? new Date() : null;
  }
  if (!Object.keys(changes).length) throw new HttpError(400, 'Send at least one of title, time, or done.');

  const result = await db.days.updateOne(
    { deviceId: req.deviceId, date, 'tasks.id': req.params.taskId },
    { $set: { ...changes, updatedAt: new Date() } },
  );
  if (!result.matchedCount) throw new HttpError(404, 'No task with that id on this day.');

  res.json(toDayResponse(date, await loadDay(req.deviceId, date)));
});

daysRouter.delete('/:date/tasks/:taskId', async (req, res) => {
  const date = checkDate(req.params.date);
  const result = await db.days.updateOne(
    { deviceId: req.deviceId, date },
    { $pull: { tasks: { id: req.params.taskId } }, $set: { updatedAt: new Date() } },
  );
  if (!result.modifiedCount) throw new HttpError(404, 'No task with that id on this day.');
  res.json(toDayResponse(date, await loadDay(req.deviceId, date)));
});

// Save the day's journal note. Body: { note: "Beach after class!" }
daysRouter.put('/:date/note', async (req, res) => {
  const date = checkDate(req.params.date);
  const note = checkText(req.body?.note ?? '', 'note', { max: 2000, optional: true }) ?? '';
  await db.days.updateOne(
    { deviceId: req.deviceId, date },
    { $set: { note, updatedAt: new Date() }, $setOnInsert: { tasks: [], photos: [] } },
    { upsert: true },
  );
  res.json(toDayResponse(date, await loadDay(req.deviceId, date)));
});

// Everything the month calendar grid needs in one call: for each day with content,
// a cover photo and task counts. Days with nothing in them are left out.
monthsRouter.get('/:month', async (req, res) => {
  const month = checkMonth(req.params.month);
  const docs = await db.days
    .find({ deviceId: req.deviceId, date: { $regex: `^${month}-` } })
    .sort({ date: 1 })
    .toArray();

  res.json({
    month,
    days: docs.map((d) => ({
      date: d.date,
      coverPhotoId: d.photos?.[0]?.id ?? null,
      photoCount: d.photos?.length ?? 0,
      tasksDone: (d.tasks ?? []).filter((t) => t.done).length,
      tasksTotal: d.tasks?.length ?? 0,
      hasNote: Boolean(d.note),
    })),
  });
});