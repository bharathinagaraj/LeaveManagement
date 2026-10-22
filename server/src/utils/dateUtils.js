

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateString = (value) => {
  if (typeof value !== "string" || !DATE_RE.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
};

export const startOfDayUtc = (value) =>
  new Date(`${value}T00:00:00.000Z`);

export const formatDate = (value) => {
  if (!value) return "";

  if (typeof value === "string" && DATE_RE.test(value)) {
    return value;
  }

  if (typeof value === "string") {
    const match = value.match(/^(\d{4}-\d{2}-\d{2})T/);

    if (match) return match[1];
  }

  return "";
};

/**
 * Formats date and time without displaying the timezone.
 * Preserves the date and time components from ISO strings.
 */
export const formatDateTime = (value) => {
  if (!value) return "";

  if (typeof value !== "string") return "";

  const match = value.match(
    /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/
  );

  if (match) {
    return `${match[1]} ${match[2]}:${match[3]}`;
  }

  if (DATE_RE.test(value)) {
    return `${value} 00:00`;
  }

  return "";
};

export const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

/**
 * Counts full working days (Monday-Friday), inclusive.
 * Public holidays are ignored per the leave policy.
 */
export const countWorkingDays = (startDate, endDate) => {
  const start = startOfDayUtc(startDate);
  const end = startOfDayUtc(endDate);

  if (start > end) return 0;

  let days = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    if (!isWeekend(cursor)) {
      days += 1;
    }

    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return days;
};

/**
 * Validates a startDate and endDate pair.
 */
export const validateDateRange = (startDate, endDate) => {
  if (!isValidDateString(startDate) || !isValidDateString(endDate)) {
    return "Invalid date format. Use YYYY-MM-DD.";
  }

  if (startDate > endDate) {
    return "Start date must be on or before end date.";
  }

  return null;
};
