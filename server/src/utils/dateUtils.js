const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDateString = (value) =>
  typeof value === "string" && DATE_RE.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));

export const startOfDayUtc = (value) => new Date(`${value}T00:00:00.000Z`);

export const isWeekend = (date) => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

/**
 * Counts full working days (Monday-Friday) between startDate and endDate inclusive.
 * Public holidays are ignored per the leave policy.
 */
export const countWorkingDays = (startDate, endDate) => {
  const start = startOfDayUtc(startDate);
  const end = startOfDayUtc(endDate);

  if (start > end) {
    return 0;
  }

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
 * Validates a (startDate, endDate) pair. Returns an error message or null.
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