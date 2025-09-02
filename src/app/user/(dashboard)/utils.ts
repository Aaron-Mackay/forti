export function extractGapSeries(data: DataPoint[], metricLabel: string) {
  const gapSeries: Series[] = [];
  let i = 0;

  while (i < data.length) {
    if (data[i][1] === null) {
      // Find previous valid
      let prevIndex = i - 1;
      while (prevIndex >= 0 && data[prevIndex][1] === null) prevIndex--;

      // Find next valid
      let nextIndex = i + 1;
      while (nextIndex < data.length && data[nextIndex][1] === null) nextIndex++;

      if (prevIndex >= 0 && nextIndex < data.length) {
        gapSeries.push({
          name: metricLabel,
          data: [
            [data[prevIndex][0], data[prevIndex][1]],
            [data[nextIndex][0], data[nextIndex][1]],
          ],
        });
      }

      i = nextIndex;
    } else {
      i++;
    }
  }

  return gapSeries;
}

export type DataPoint = [number, number | string | boolean | Date | null];
export type Series = { name: string; data: DataPoint[] };