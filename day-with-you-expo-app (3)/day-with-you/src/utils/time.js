export function todayISO() { return new Date().toISOString().slice(0, 10); }
export function nowMinutes() { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
export function toMinutes(hhmm) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }
export function minutesToLabel(mins) {
  const h = Math.floor(mins / 60), m = mins % 60, period = h >= 12 ? "PM" : "AM", h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
export function addDaysIso(iso, n) { const d = new Date(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }
export function mondayOf(iso) { const d = new Date(iso); const idx = (d.getDay() + 6) % 7; d.setDate(d.getDate() - idx); return d.toISOString().slice(0, 10); }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

export function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - startOffset);
  const cells = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    cells.push({ date: d, iso: d.toISOString().slice(0, 10), inMonth: d.getMonth() === month });
  }
  while (cells.length > 35 && !cells.slice(-7).some((c) => c.inMonth)) cells.splice(cells.length - 7, 7);
  return cells;
}

export function getWeekDates(iso) {
  const monday = new Date(mondayOf(iso));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i);
    return d;
  });
}
