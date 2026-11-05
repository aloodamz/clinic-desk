/*
 * Demo clock. The staff app runs on a pinned demo morning so the send gate's
 * quiet hours (9 pm to 9 am India time) never block a live demo. The clock
 * still ticks forward from the moment the page loads, so timers move.
 * Flip to real time in Settings > Demo.
 */
const DEMO_START = "2026-11-05T10:40:00+05:30";
export const TZ = "Asia/Kolkata";

const loadedAt = typeof window === "undefined" ? 0 : Date.now();
let useReal = false;

export function setRealClock(v: boolean) {
  useReal = v;
}

export function now(): Date {
  if (useReal) return new Date();
  const elapsed = typeof window === "undefined" ? 0 : Date.now() - loadedAt;
  return new Date(new Date(DEMO_START).getTime() + elapsed);
}

export function nowIso(): string {
  return now().toISOString();
}

