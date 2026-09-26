// Small validation helpers. Express 5 forwards errors thrown here to the error handler.

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const DEVICE_ID = /^[A-Za-z0-9_-]{8,64}$/;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
const YEAR = /^\d{4}$/;

/**
 * There are no accounts. The app makes a random ID on first launch, saves it on the
 * phone, and sends it with every request as the "X-Device-Id" header.
 * Image components that can't send headers can use "?d=<deviceId>" instead.
 */
export function requireDevice(req, _res, next) {
  const deviceId = req.get('x-device-id') || req.query.d;
  if (!deviceId || !DEVICE_ID.test(deviceId)) {
    throw new HttpError(401, 'Send a device ID (8-64 letters, numbers, - or _) in the X-Device-Id header.');
  }
  req.deviceId = deviceId;
  next();
}

export function checkDate(value) {
  if (!DATE.test(value)) throw new HttpError(400, `"${value}" isn't a date. Use YYYY-MM-DD.`);
  return value;
}

export function checkMonth(value) {
  if (!MONTH.test(value)) throw new HttpError(400, `"${value}" isn't a month. Use YYYY-MM.`);
  return value;
}

export function checkYear(value) {
  if (!YEAR.test(value)) throw new HttpError(400, `"${value}" isn't a year. Use YYYY.`);
  return value;
}

export function checkText(value, field, { max = 200, optional = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (optional) return undefined;
    throw new HttpError(400, `"${field}" is required.`);
  }
  if (typeof value !== 'string') throw new HttpError(400, `"${field}" must be text.`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new HttpError(400, `"${field}" can be at most ${max} characters.`);
  return trimmed;
}