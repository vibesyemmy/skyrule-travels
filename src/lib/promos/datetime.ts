/**
 * West Africa Time is a fixed UTC+1 with no daylight saving, so the conversion
 * is a constant offset and needs no timezone database.
 */
const WAT_OFFSET_MINUTES = 60;
const MINUTE_MS = 60_000;

const LOCAL_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Convert a `datetime-local` input value (interpreted as WAT) to a UTC ISO string. */
export function watLocalToUtcIso(local: string): string | null {
  const match = LOCAL_PATTERN.exec(local);
  if (!match) return null;
  const [, y, m, d, h, min] = match;
  const utcMs = Date.UTC(+y, +m - 1, +d, +h, +min) - WAT_OFFSET_MINUTES * MINUTE_MS;
  const date = new Date(utcMs);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Convert a stored UTC ISO string to a `datetime-local` input value in WAT. */
export function utcIsoToWatLocal(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const shifted = new Date(date.getTime() + WAT_OFFSET_MINUTES * MINUTE_MS);
  return shifted.toISOString().slice(0, 16);
}
