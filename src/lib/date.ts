/**
 * Returns a Date object representing the start of the current UTC day (00:00:00.000Z).
 *
 * Use this instead of `new Date(); d.setHours(0,0,0,0)` which gives local midnight
 * converted to UTC — causing "today" queries to miss check-ins posted between
 * local midnight and UTC midnight for users in negative UTC offsets.
 */
export const getUtcDayStart = (): Date => {
  const todayDateStr = new Date().toISOString().split('T')[0];
  return new Date(`${todayDateStr}T00:00:00.000Z`);
};

/**
 * Returns the ISO string for the start of the current UTC day.
 * Convenience wrapper around getUtcDayStart().
 */
export const getUtcDayStartISO = (): string => getUtcDayStart().toISOString();

/**
 * Returns the YYYY-MM-DD string for today in UTC.
 */
export const getTodayUTC = (): string => new Date().toISOString().split('T')[0];
