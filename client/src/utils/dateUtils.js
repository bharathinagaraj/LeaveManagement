const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a date-only value ("2026-06-08") or a full ISO timestamp into a Date.
 * Date-only values are anchored to UTC so they always keep the exact calendar
 * day that was stored, whatever the browser's timezone is.
 */
export const parseDate = (value) => {
  if (!value) return null;
  const date = DATE_RE.test(value)
    ? new Date(`${value}T00:00:00.000Z`)
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

/**
 * Counts full working days (Monday-Friday) between startDate and endDate inclusive,
 * matching the server-side leave policy.
 */
export const countWorkingDays = (startDate, endDate) => {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || start > end) return 0;

  let days = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (!isWeekend(cursor)) days += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
};

/**
 * Formats a stored date. Rendering always happens in UTC so the value shown is
 * exactly the calendar date held in the database, with no timezone shift.
 */
export const formatDate = (value) => {
  const date = parseDate(value);
  if (!date) return value || "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
};

/**
 * Formats a stored timestamp (date + time) in UTC, so every client sees the
 * same value regardless of its own timezone.
 */
export const formatDateTime = (iso) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
};

export const todayInput = () => {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const addDaysInput = (base, days) => {
  const date = parseDate(base);
  if (!date) return "";
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};