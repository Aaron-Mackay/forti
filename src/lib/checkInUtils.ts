/**
 * Check-in date utilities.
 * checkInDay convention: 0 = Monday … 6 = Sunday (matches the Settings field).
 */

import type { WeeklyCheckIn } from '@/types/checkInTypes';

type RatingFields = Pick<WeeklyCheckIn,
  'energyLevel' | 'moodRating' | 'stressLevel' | 'sleepQuality' | 'recoveryRating' | 'adherenceRating'
>;
type ReflectionFields = Pick<WeeklyCheckIn, 'weekReview' | 'coachMessage' | 'goalsNextWeek'>;
type PhotoFields = Pick<WeeklyCheckIn, 'frontPhotoUrl' | 'backPhotoUrl' | 'sidePhotoUrl'>;

export function checkInHasRatings(c: RatingFields): boolean {
  return [c.energyLevel, c.moodRating, c.stressLevel, c.sleepQuality, c.recoveryRating, c.adherenceRating]
    .some(v => v !== null);
}

export function checkInHasReflection(c: ReflectionFields): boolean {
  return Boolean(c.weekReview || c.coachMessage || c.goalsNextWeek);
}

export function checkInHasPhotos(c: PhotoFields): boolean {
  return Boolean(c.frontPhotoUrl || c.backPhotoUrl || c.sidePhotoUrl);
}

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
 * Returns the start of the 7-day check-in window for a given user.
 * The window covers the 7 days prior to, but NOT including, the most recent
 * occurrence of `checkInDay` (up to and including `today`).
 *
 * checkInDay convention: 0 = Monday … 6 = Sunday.
 *
 * Examples (checkInDay = 1 = Tuesday):
 *   today = Tue 14 Apr  →  checkInDate = 14 Apr  →  weekStart =  7 Apr
 *   today = Wed 15 Apr  →  checkInDate = 14 Apr  →  weekStart =  7 Apr
 *   today = Mon 13 Apr  →  checkInDate =  7 Apr  →  weekStart = 31 Mar
 */
export function getCheckInWeekStart(today: Date, checkInDay: number): Date {
  const d = new Date(today);
  d.setHours(0, 0, 0, 0);
  const dayOfWeek = (d.getDay() + 6) % 7; // convert JS Sun=0 → Mon=0 convention
  const daysBack = (dayOfWeek - checkInDay + 7) % 7; // steps back to most-recent checkInDay
  d.setDate(d.getDate() - daysBack - 7); // land on checkInDay, then go back 7 more days
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
