/**
 * Check-in date utilities.
 * checkInDay convention: 0 = Monday … 6 = Sunday (matches the Settings field).
 */

/**
 * Returns the Monday (ISO week start) of the week containing `date`.
 * Used as the canonical `weekStartDate` key regardless of the user's chosen
 * check-in day — the check-in window always belongs to that ISO week.
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  // JS getDay(): 0=Sun, 1=Mon … 6=Sat. Convert to Mon-based (0=Mon … 6=Sun).
  const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Given a week start (Monday) and a checkInDay (0=Mon…6=Sun),
 * returns the actual calendar date when the check-in falls that week.
 */
export function getCheckInDate(weekStart: Date, checkInDay: number): Date {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + checkInDay);
  return d;
}

/**
 * Returns a UTC midnight Date from a date-only string or Date,
 * suitable for Prisma @db.Date comparisons.
 */
export function toDateOnly(date: Date | string): Date {
  const d = new Date(date);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}
