export const SERVER_URL = 'http://192.168.10.86:3000';
const DEVICE_ID = 'tickit-demo-device';

export function todayString(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function thisMonthString(date = new Date()) {
  return todayString(date).slice(0, 7);
}

async function request(path, { method = 'GET', body, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const isForm = body instanceof FormData;
  const headers = { 'X-Device-Id': DEVICE_ID };
  if (body && !isForm) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${SERVER_URL}${path}`, {
      method,
      headers,
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: controller.signal,
    });
  } catch (err) {
    throw new Error(
      err.name === 'AbortError'
        ? 'The server took too long to answer.'
        : "Can't reach the server. Is it running, and is the phone on the same Wi-Fi?",
    );
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const getDay = (date = todayString()) => request(`/days/${date}`);

export const addTask = (title, date = todayString(), time = null) =>
  request(`/days/${date}/tasks`, { method: 'POST', body: { title, time } });

export const setTaskDone = (taskId, done, date = todayString()) =>
  request(`/days/${date}/tasks/${taskId}`, { method: 'PATCH', body: { done } });

export const deleteTask = (taskId, date = todayString()) =>
  request(`/days/${date}/tasks/${taskId}`, { method: 'DELETE' });

export const getMonth = (month = thisMonthString()) => request(`/months/${month}`);

export function uploadPhoto(uri, { date = todayString(), caption = '', kind = 'journal' } = {}) {
  const form = new FormData();
  form.append('photo', { uri, name: 'photo.jpg', type: 'image/jpeg' });
  form.append('date', date);
  if (caption) form.append('caption', caption);
  form.append('kind', kind);
  return request('/photos', { method: 'POST', body: form, timeoutMs: 60000 });
}

export const photoUrl = (photoId) => `${SERVER_URL}/photos/${photoId}?d=${DEVICE_ID}`;

export async function getRecap(period, key) {
  try {
    return await request(`/recaps/${period}/${key}`);
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
}

export const makeRecap = (period, key) =>
  request(`/recaps/${period}/${key}`, { method: 'POST', timeoutMs: 120000 });

export const shareRecap = (recapId) => request(`/recaps/${recapId}/share`, { method: 'POST' });