export type DataPoint = [number, number | string | boolean | Date | null];
export type Series = { name: string; data: DataPoint[], yAxisIndex: YAxisIndex };

export type YAxisIndex = 0 | 1
