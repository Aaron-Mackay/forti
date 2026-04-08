'use client';

import dynamic from 'next/dynamic';
import {Box, Skeleton, Typography} from '@mui/material';
import {format} from 'date-fns';
import type {E1rmHistoryPoint} from '@/app/api/exercises/[exerciseId]/e1rm-history/route';
import {PRIMARY_COLOUR, SUCCESS_COLOUR} from '@lib/theme';

const Chart = dynamic(
  () => import('react-apexcharts').catch(() => ({default: () => null})),
  {ssr: false, loading: () => <Skeleton variant="rounded" height={80}/>},
);

export default function E1rmSparkline({
  exerciseId,
  history,
  todayE1RM,
  isNewBest,
}: {
  exerciseId: number;
  history: E1rmHistoryPoint[] | null;
  todayE1RM: number | null;
  isNewBest: boolean;
}) {
  if (history === null) {
    return (
      <Box sx={{width: '100%', mb: 1}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5, mb: 0.5}}>
          <Skeleton variant="text" width={100}/>
          <Skeleton variant="text" width={80}/>
        </Box>
        <Skeleton variant="rounded" height={80}/>
      </Box>
    );
  }

  const valid = history.filter(p => typeof p.bestE1rm === 'number');
  if (valid.length === 0 && todayE1RM === null) {
    return (
      <Box sx={{width: '100%', mb: 1}}>
        <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5, mb: 0.5}}>
          <Typography variant="caption" color="text.secondary">
            Est. 1RM history
          </Typography>
        </Box>
        <Box
          sx={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px dashed',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="caption" color="text.disabled">
            Log a weighted set to start tracking
          </Typography>
        </Box>
      </Box>
    );
  }

  const historicalBest = valid.length > 0 ? valid[valid.length - 1].bestE1rm : null;
  const displayBest = Math.max(todayE1RM || 0, (historicalBest || 0))

  // Build series: historical points + optional live "Now" point
  const historicalData = valid.map(p => parseFloat(p.bestE1rm.toFixed(1)));
  const historicalCategories = valid.map(p => format(new Date(p.date), 'dd MMM'));

  const seriesData = todayE1RM !== null
    ? [...historicalData, parseFloat(todayE1RM.toFixed(1))]
    : historicalData;
  const categories = todayE1RM !== null
    ? [...historicalCategories, 'Now']
    : historicalCategories;

  if (seriesData.length === 0) return null;

  // Discrete marker override: colour only the live "Now" point green
  const discreteMarkers = todayE1RM !== null
    ? [{seriesIndex: 0, dataPointIndex: seriesData.length - 1, fillColor: SUCCESS_COLOUR, strokeColor: SUCCESS_COLOUR, size: 5}]
    : [];

  const series = [{name: 'Best e1RM', data: seriesData}];

  return (
    <Box sx={{width: '100%', mb: 1}}>
      <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', px: 0.5}}>
        <Typography variant="caption" color="text.secondary">
          Est. 1RM history
        </Typography>
        {displayBest !== null && (
          <Typography
            variant="caption"
            color={isNewBest ? 'success.main' : 'primary'}
            fontWeight={600}
          >
            {isNewBest ? 'New best' : 'Personal Best'}: {displayBest.toFixed(1)}
          </Typography>
        )}
      </Box>
      {/* swiper-no-swiping prevents Swiper from intercepting touch events on this chart */}
      <Box className="swiper-no-swiping">
        <Chart
          type="line"
          height={80}
          series={series}
          options={{
            chart: {
              selection: {enabled: false},
              zoom: {enabled: false},
              id: `e1rm-sparkline-${exerciseId}`,
              animations: {enabled: false},
              toolbar: {show: false},
            },
            stroke: {curve: 'smooth', width: 2},
            markers: {
              size: 4,
              discrete: discreteMarkers,
            },
          tooltip: {
            x: {formatter: (_v, opts?: {dataPointIndex?: number}) => categories[opts?.dataPointIndex ?? 0] ?? ''},
          },
            colors: [PRIMARY_COLOUR],
            xaxis: {
              categories,
              labels: {show: false},
              axisBorder: {show: false},
              axisTicks: {show: false},
            },
            yaxis: {
              labels: {show: false},
            },
            grid: {
              show: false,
              padding: {left: 0, right: 8, top: 5, bottom: 0},
            },
          }}
        />
      </Box>
    </Box>
  );
}
