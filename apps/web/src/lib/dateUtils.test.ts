import { convertDateToDateString, convertDateStringToDate } from './dateUtils';

describe('dateUtils', () => {
  describe('convertDateToDateString', () => {
    it('should convert a Date to YYYY-MM-DD string', () => {
      const date = new Date(2023, 4, 9); // May 9, 2023 (month is 0-based)
      expect(convertDateToDateString(date)).toBe('2023-05-09');
    });

    it('should pad single-digit months and days with zero', () => {
      const date = new Date(2023, 0, 1); // Jan 1, 2023
      expect(convertDateToDateString(date)).toBe('2023-01-01');
    });

    it('should handle December correctly', () => {
      const date = new Date(2023, 11, 31); // Dec 31, 2023
      expect(convertDateToDateString(date)).toBe('2023-12-31');
    });
  });

  describe('convertDateStringToDate', () => {
    it('should convert YYYY-MM-DD string to Date', () => {
      const dateString = '2023-05-09';
      const date = convertDateStringToDate(dateString);
      expect(date.getFullYear()).toBe(2023);
      expect(date.getMonth()).toBe(4); // May (0-based)
      expect(date.getDate()).toBe(9);
    });

    it('should handle leap years', () => {
      const dateString = '2020-02-29';
      const date = convertDateStringToDate(dateString);
      expect(date.getFullYear()).toBe(2020);
      expect(date.getMonth()).toBe(1); // February
      expect(date.getDate()).toBe(29);
    });

    it('should produce an invalid date for malformed input', () => {
      const dateString = 'not-a-date';
      const date = convertDateStringToDate(dateString);
      expect(isNaN(date.getTime())).toBe(true);
    });
  });

  describe('round-trip conversion', () => {
    it('should preserve the date when converting to string and back', () => {
      const original = new Date(2022, 7, 15); // Aug 15, 2022
      const str = convertDateToDateString(original);
      const result = convertDateStringToDate(str);
      expect(result.getFullYear()).toBe(original.getFullYear());
      expect(result.getMonth()).toBe(original.getMonth());
      expect(result.getDate()).toBe(original.getDate());
    });
  });
});