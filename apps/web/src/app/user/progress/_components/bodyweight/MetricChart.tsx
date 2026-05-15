'use client';

import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { signalTokens } from '@lib/signal/tokens';
import type { MetricPoint } from '@lib/metricSeries/extractSeries';
import { rangeDays, type TimeRange } from '@lib/metricSeries/timeRange';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({ default: () => null })),
  { ssr: false },
);

const palette = signalTokens.surface.planning;

type Props = {
  id: string;
  raw: MetricPoint[];
  movingAvg: MetricPoint[];
  timeRange: TimeRange;
  formatValue: (value: number) => string;
};

export function MetricChart({ id, raw, movingAvg, timeRange, formatValue }: Props) {
  if (raw.length === 0) {
    return (
      <div style={{ padding: '20px', fontSize: 13, color: palette.inkMid, lineHeight: 1.6 }}>
        No data in this time range.
      </div>
    );
  }

  const now = Date.now();
  const days = rangeDays(timeRange);
  const rawData = raw.map((p) => ({ x: p.date.getTime(), y: Number(p.value.toFixed(2)) }));
  const maData = movingAvg.map((p) => ({ x: p.date.getTime(), y: Number(p.value.toFixed(2)) }));

  return (
    <Chart
      type="line"
      height={300}
      series={[
        { name: '7-day avg', type: 'line', data: maData },
        { name: 'daily log', type: 'scatter', data: rawData },
      ]}
      options={{
        chart: {
          id: `metric-detail-${id}`,
          animations: { enabled: false },
          toolbar: { show: false },
          zoom: { enabled: false },
          selection: { enabled: false },
        },
        stroke: { curve: 'smooth', width: [2, 0] },
        markers: { size: [0, 4], strokeWidth: 0 },
        legend: {
          show: true,
          position: 'bottom',
          horizontalAlign: 'left',
          fontFamily: signalTokens.fontVar.mono,
          fontSize: '11px',
          markers: { size: 5 },
          labels: { colors: palette.inkMid },
        },
        tooltip: {
          shared: false,
          x: {
            formatter: (val: number) => (val ? format(new Date(val), 'dd MMM yyyy') : ''),
          },
          y: { formatter: (val: number) => formatValue(val) },
        },
        colors: [signalTokens.chart.series1, signalTokens.signal.deep],
        xaxis: {
          type: 'datetime',
          ...(days != null && { min: now - days * 86400000, max: now, tickAmount: 4 }),
          labels: {
            style: { fontFamily: signalTokens.fontVar.mono, fontSize: '10px', colors: palette.inkLight },
            formatter: (_val: string, timestamp?: number) => {
              if (timestamp == null) return _val;
              const weeksAgo = (now - timestamp) / (7 * 86400000);
              if (weeksAgo < 0.5) return 'this week';
              return `${Math.round(weeksAgo)}w ago`;
            },
          },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          forceNiceScale: true,
          labels: {
            style: { fontFamily: signalTokens.fontVar.mono, fontSize: '10px', colors: palette.inkLight },
            formatter: (v: number) => formatValue(v),
          },
        },
        grid: {
          borderColor: palette.border,
          padding: { left: 4, right: 12, top: 4, bottom: 0 },
        },
      }}
    />
  );
}
