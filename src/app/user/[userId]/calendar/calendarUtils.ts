import {addDays, addWeeks, format} from 'date-fns';

/**
 * Generates an array of weeks, each containing an array of 7 days.
 */
export function generateWeeks(startDate: Date, numberOfWeeks: number) {
  return Array.from({length: numberOfWeeks}, (_, i) =>
    Array.from({length: 7}, (_, d) => addDays(addWeeks(startDate, i), d))
  );
}

/**
 * Takes an array of weeks and returns an object with the month labels and the index of the first week of each month.
 */
export function getMonthLabels(weeks: Date[][]) {
  const monthLabels: { [key: string]: number } = {};
  weeks.forEach((week, i) => {
    const month = format(week[0], 'MMMM yyyy');
    if (!(month in monthLabels)) monthLabels[month] = i;
  });
  return monthLabels;
}