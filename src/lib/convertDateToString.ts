/**
 * Converts a Date object to a string in 'YYYY-MM-DD' format, so that
 * serialisation does not shift the date.
 *
 * @param date - The Date object to convert.
 * @returns The formatted date string.
 */
const convertDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default convertDateToString;