/**
 * Converts a Date object to a string in 'YYYY-MM-DD' format, so that
 * serialisation does not shift the date.
 *
 * @param date - The Date object to convert.
 * @returns The formatted date string.
 */
export const convertDateToDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Converts a date string to a Date object
 *
 * @param dateString - The formatted date string to convert.
 * @returns The Date object.
 */
export const convertDateStringToDate = (dateString: string): Date =>
  new Date(dateString);