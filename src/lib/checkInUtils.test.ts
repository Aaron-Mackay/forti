import { getCheckInWeekStart } from './checkInUtils';

describe('getCheckInWeekStart', () => {
  // checkInDay = 1 = Tuesday (0=Mon convention)

  it('returns 7 days before today when today IS the checkInDay', () => {
    // Tuesday 14 Apr 2026 → checkInDay=1 → weekStart = Tue 7 Apr 2026
    const today = new Date(2026, 3, 14); // month is 0-indexed
    const result = getCheckInWeekStart(today, 1);
    expect(result).toEqual(new Date(2026, 3, 7));
  });

  it('returns 7 days before the most recent checkInDay when today is after it', () => {
    // Wednesday 15 Apr 2026 → most recent Tue = 14 Apr → weekStart = Tue 7 Apr 2026
    const today = new Date(2026, 3, 15);
    const result = getCheckInWeekStart(today, 1);
    expect(result).toEqual(new Date(2026, 3, 7));
  });

  it('walks back to the previous week when checkInDay is tomorrow', () => {
    // Monday 13 Apr 2026 → most recent Tue = 7 Apr → weekStart = Tue 31 Mar 2026
    const today = new Date(2026, 3, 13);
    const result = getCheckInWeekStart(today, 1);
    expect(result).toEqual(new Date(2026, 2, 31));
  });

  it('works for checkInDay=0 (Monday, the default)', () => {
    // Monday 13 Apr 2026 → most recent Mon = 13 Apr → weekStart = Mon 6 Apr 2026
    const today = new Date(2026, 3, 13);
    const result = getCheckInWeekStart(today, 0);
    expect(result).toEqual(new Date(2026, 3, 6));
  });

  it('works for checkInDay=6 (Sunday)', () => {
    // Sunday 19 Apr 2026 → most recent Sun = 19 Apr → weekStart = Sun 12 Apr 2026
    const today = new Date(2026, 3, 19);
    const result = getCheckInWeekStart(today, 6);
    expect(result).toEqual(new Date(2026, 3, 12));
  });

  it('returns a date with time zeroed out', () => {
    const today = new Date(2026, 3, 14, 15, 30, 45);
    const result = getCheckInWeekStart(today, 1);
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
  });
});
