// MOCK. Real version: expo-auth-session + Calendar API v3, reading the link saved in
// Settings. Every screen above this layer only depends on the shapes below, so swapping
// this file's bodies for real fetch calls is a drop-in change.
import { TODAYS_EVENTS, MISSED_YESTERDAY } from "../data/mockData";

export async function fetchEventsForDate(_dateISO) {
  await new Promise((r) => setTimeout(r, 250));
  return TODAYS_EVENTS;
}
export async function fetchMissedFromYesterday() {
  await new Promise((r) => setTimeout(r, 100));
  return MISSED_YESTERDAY;
}
export async function isConnected() { return true; }
