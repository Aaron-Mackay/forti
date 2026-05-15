'use client';

import dynamic from 'next/dynamic';
import { signalTokens } from '@lib/signal/tokens';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({ default: () => null })),
  { ssr: false },
);

type Props = {
  id: string;
  data: { x: number; y: number }[];
};

export function MetricSparkline({ id, data }: Props) {
  if (data.length < 2) return <div style={{ width: 60 }} />;
  return (
    <div style={{ width: 60, flexShrink: 0 }}>
      <Chart
        type="line"
        height={28}
        width={60}
        series={[{ name: '', data }]}
        options={{
          chart: {
            id: `metric-spark-${id}`,
            animations: { enabled: false },
            toolbar: { show: false },
            zoom: { enabled: false },
            selection: { enabled: false },
            sparkline: { enabled: true },
          },
          stroke: { curve: 'smooth', width: 1.5 },
          markers: { size: 0 },
          tooltip: { enabled: false },
          colors: [signalTokens.chart.series1],
          xaxis: { labels: { show: false }, axisBorder: { show: false }, axisTicks: { show: false } },
          yaxis: { labels: { show: false } },
          grid: { show: false, padding: { left: 0, right: 0, top: 0, bottom: 0 } },
        }}
      />
    </div>
  );
}
