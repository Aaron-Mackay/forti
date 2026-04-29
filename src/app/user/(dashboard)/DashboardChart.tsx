'use client'

import dynamic from "next/dynamic";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Button, Skeleton, Typography} from "@mui/material";
import {addDays, subDays, subMonths} from "date-fns";
import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";
import {DataPoint, Series} from "@/app/user/(dashboard)/utils";
import {GestureHandlers, useGesture} from "@use-gesture/react";
import type {BodyweightUnit} from "@/types/settingsTypes";

const CHART_HEIGHT = 220;

const Chart = dynamic(
  () => import("react-apexcharts").catch(() => ({default: () => null})),
  {
    ssr: false,
    loading: () => <Skeleton variant="rounded" height={CHART_HEIGHT - 15} sx={{my: '15px'}}/>
  }
);

type Selection = {
  xaxis: { min: number; max: number };
}

type DashboardMetricKey = 'weight' | 'calories' | 'steps';

type MetricConfig = {
  key: DashboardMetricKey;
  label: string;
  color: string;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {key: 'weight', label: 'Weight', color: '#00a2f1'},
  {key: 'calories', label: 'Calories', color: '#d30bff'},
  {key: 'steps', label: 'Steps', color: '#2e7d32'},
];

const Y_AXIS_ROUNDING_STEP: Record<DashboardMetricKey, number> = {
  weight: 0.5,
  calories: 100,
  steps: 1000,
};
const WEIGHT_TREND_WINDOW = 7;

const formatLabel = (val: number, metricKey: DashboardMetricKey): string => {
  switch (metricKey) {
    case 'weight':
      return val.toPrecision(3);
    case 'calories':
    case 'steps':
      return val.toFixed(0);
    default:
      return val.toString();
  }
}

function buildRollingAverageSeries(data: DataPoint[], windowSize: number): DataPoint[] {
  const sorted = [...data].sort((a, b) => a[0] - b[0]);
  const window: number[] = [];
  let runningTotal = 0;

  return sorted.map(([x, y]) => {
    if (typeof y !== 'number') return [x, null];
    window.push(y);
    runningTotal += y;
    if (window.length > windowSize) {
      const removed = window.shift();
      if (typeof removed === 'number') runningTotal -= removed;
    }
    return [x, runningTotal / window.length];
  });
}

type MetricChartCardProps = {
  metric: MetricConfig;
  bodyweightUnit: BodyweightUnit;
  series: Series[];
  selection: Selection;
  chartBlocks: { name: string; start: number; end: number; color: string }[];
  startDayMs: number;
  todayMs: number;
  updateXaxis: (newMin: number, newMax: number) => void;
}

function MetricChartCard({
  metric,
  bodyweightUnit,
  series,
  selection,
  chartBlocks,
  startDayMs,
  todayMs,
  updateXaxis
}: MetricChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startWidth?: number, centerMs?: number }>({});
  const selectionRef = useRef(selection);
  const frameRequestRef = useRef<number | null>(null);
  const pendingXaxisRef = useRef<{ min: number; max: number } | null>(null);

  useEffect(() => {
    selectionRef.current = selection;
  }, [selection]);

  const chartMetrics = useCallback(() => {
    if (!chartRef.current) return {chartWidthPx: 1, msPerPixel: 1, visibleMs: 1};
    const chartWidthPx = chartRef.current.offsetWidth;
    const visibleMs = selection.xaxis.max - selection.xaxis.min;
    return {
      chartWidthPx,
      visibleMs,
      msPerPixel: visibleMs / chartWidthPx,
    };
  }, [selection]);

  const updateXaxisThrottled = useCallback((newMin: number, newMax: number): void => {
    pendingXaxisRef.current = {min: newMin, max: newMax};
    if (frameRequestRef.current !== null) return;
    frameRequestRef.current = requestAnimationFrame(() => {
      frameRequestRef.current = null;
      const pending = pendingXaxisRef.current;
      if (!pending) return;
      updateXaxis(pending.min, pending.max);
      pendingXaxisRef.current = null;
    });
  }, [updateXaxis]);

  useEffect(() => () => {
    if (frameRequestRef.current !== null) {
      cancelAnimationFrame(frameRequestRef.current);
    }
  }, []);

  const yAxisBounds = useMemo(() => {
    const visibleValues: number[] = [];
    for (const s of series) {
      for (const [x, y] of s.data) {
        if (typeof y !== 'number') continue;
        if (x < selection.xaxis.min || x > selection.xaxis.max) continue;
        visibleValues.push(y);
      }
    }
    if (visibleValues.length === 0) return null;

    const rawMin = Math.min(...visibleValues);
    const rawMax = Math.max(...visibleValues);
    const span = rawMax - rawMin;
    const baseSpan = span > 0 ? span : Math.max(Math.abs(rawMax) * 0.08, 1);
    const padding = baseSpan * 0.08;

    const step = Y_AXIS_ROUNDING_STEP[metric.key];
    let min = Math.floor((rawMin - padding) / step) * step;
    let max = Math.ceil((rawMax + padding) / step) * step;

    if (metric.key === 'calories' || metric.key === 'steps') min = Math.max(0, min);
    if (max <= min) max = min + step;

    return {min, max};
  }, [metric.key, selection.xaxis.max, selection.xaxis.min, series]);

  useEffect(() => {
    const el = chartRef.current;
    if (!el) return;

    const onWheelZoom = (e: WheelEvent) => {
      e.preventDefault();
      const {chartWidthPx, visibleMs} = chartMetrics();
      const rect = el.getBoundingClientRect();
      const ox = e.clientX - rect.left;

      const zoomFactor = 1 - e.deltaY * 0.002;
      if (zoomFactor <= 0) return;

      const centerMs = selection.xaxis.min + (ox / chartWidthPx) * visibleMs;
      const newWidth = visibleMs / zoomFactor;
      const newMin = centerMs - (centerMs - selection.xaxis.min) / visibleMs * newWidth;
      const newMax = newMin + newWidth;

      updateXaxisThrottled(newMin, newMax);
    };

    el.addEventListener('wheel', onWheelZoom, {passive: false});
    return () => el.removeEventListener('wheel', onWheelZoom);
  }, [chartMetrics, selection, updateXaxisThrottled]);

  const onDrag: GestureHandlers['onDrag'] = ({delta: [dx]}) => {
    const {msPerPixel} = chartMetrics();

    const deltaMs = -dx * msPerPixel;
    const currentSelection = selectionRef.current;
    const totalRange = todayMs - startDayMs;
    const width = currentSelection.xaxis.max - currentSelection.xaxis.min;
    if (width >= totalRange) return;
    const newMin = Math.max(startDayMs, Math.min(currentSelection.xaxis.min + deltaMs, todayMs - width));
    const newMax = newMin + width;
    updateXaxisThrottled(newMin, newMax);
  }

  const onPinch: GestureHandlers['onPinch'] = ({first, origin: [ox], movement: [mscale]}) => {
    const {chartWidthPx, visibleMs} = chartMetrics();

    if (first) {
      pinchRef.current.startWidth = visibleMs;
      pinchRef.current.centerMs = selection.xaxis.min + (ox / chartWidthPx) * visibleMs;
    }

    const startWidth = pinchRef.current.startWidth ?? visibleMs;
    const centerMs = pinchRef.current.centerMs ?? selection.xaxis.min + visibleMs / 2;

    let newWidth = startWidth / mscale;

    const minZoomMs = 1000 * 60 * 60 * 24 * 7;
    const maxZoomMs = todayMs - startDayMs;
    newWidth = Math.max(minZoomMs, Math.min(newWidth, maxZoomMs));

    let newMin = centerMs - (centerMs - selection.xaxis.min) / visibleMs * newWidth;
    let newMax = newMin + newWidth;

    if (newMin < startDayMs) {
      newMin = startDayMs;
      newMax = newMin + newWidth;
    }
    if (newMax > todayMs) {
      newMax = todayMs;
      newMin = newMax - newWidth;
    }

    updateXaxisThrottled(newMin, newMax);
  };

  const bindGestures = useGesture(
    {onDrag, onPinch},
    {drag: {axis: 'x'}, pinch: {scaleBounds: {min: 0.1, max: 10}}}
  );

  const chartOptions: ApexCharts.ApexOptions = {
    colors: metric.key === 'weight' && series.length > 1
      ? [metric.color, '#1565c0']
      : [metric.color],
    chart: {
      id: `chart-${metric.key}`,
      type: "line",
      height: CHART_HEIGHT,
      zoom: {enabled: false},
      animations: {enabled: false},
      toolbar: {show: false}
    },
    stroke: {
      curve: "smooth",
      width: metric.key === 'weight' && series.length > 1 ? [2, 3] : 2,
      dashArray: 0,
    },
    markers: {
      size: metric.key === 'weight' && series.length > 1 ? [3, 0] : 3,
      shape: "diamond",
      colors: ['#000000'],
    },
    xaxis: {type: "datetime", min: selection.xaxis.min, max: selection.xaxis.max},
    yaxis: {
      min: yAxisBounds?.min,
      max: yAxisBounds?.max,
      title: {
        text: metric.key === 'weight'
          ? `Weight (${bodyweightUnit})`
          : metric.label
      },
      labels: {formatter: val => formatLabel(val, metric.key)},
    },
    tooltip: {x: {format: "yyyy-MM-dd"}},
    legend: {show: false},
    annotations: {
      xaxis: chartBlocks.map(phase => ({
        x: phase.start,
        x2: phase.end,
        fillColor: phase.color,
        opacity: 0.25,
        label: {
          text: phase.name,
          borderColor: phase.color,
          style: {background: phase.color, color: "#fff", fontWeight: 600}
        }
      }))
    }
  };

  return (
    <Box sx={{position: 'relative'}} ref={chartRef}>
      <Chart options={chartOptions} series={series} type="line" height={CHART_HEIGHT}/>
      <Box
        {...bindGestures()}
        tabIndex={0}
        role="application"
        aria-label="Dashboard chart. Drag to pan, wheel or pinch to zoom."
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: 'grab',
          touchAction: 'none',
          zIndex: 10,
          backgroundColor: 'transparent',
        }}
      />
    </Box>
  );
}

export default function DashboardChart({
  metrics = [],
  blocks = [],
  bodyweightUnit = 'kg'
}: {
  metrics: MetricPrisma[];
  blocks: EventPrisma[];
  bodyweightUnit?: BodyweightUnit;
}) {
  const metricDataByType = useMemo<Record<DashboardMetricKey, DataPoint[]>>(() => ({
    weight: metrics
      .filter(dm => dm.weight !== null)
      .map(dm => [new Date(dm.date).getTime(), dm.weight]),
    calories: metrics
      .filter(dm => dm.calories !== null)
      .map(dm => [new Date(dm.date).getTime(), dm.calories]),
    steps: metrics
      .filter(dm => dm.steps !== null)
      .map(dm => [new Date(dm.date).getTime(), dm.steps]),
  }), [metrics]);

  const getData = useCallback(
    (metric: DashboardMetricKey): DataPoint[] => metricDataByType[metric],
    [metricDataByType]
  );

  const today: Date = useMemo(() => new Date(), []);
  const startDay =
    metrics[0]?.date
    ?? blocks[0]?.startDate
    ?? subMonths(today, 7);
  const startDayMs = startDay.getTime();
  const todayMs = today.getTime();

  const defaultRange = useMemo(() => ({
    min: subDays(today, 28).getTime(),
    max: todayMs,
  }), [today, todayMs]);

  const [selection, setSelection] = useState<Selection>({
    xaxis: {min: defaultRange.min, max: defaultRange.max}
  });
  const [showGestureHint, setShowGestureHint] = useState(false);

  const chartBlocks = useMemo(() => (
    blocks.map(block => ({
      name: block.name,
      start: block.startDate.getTime(),
      end: addDays(block.endDate, 1).getTime(),
      color: block.customColor ?? (block.blockSubtype ? getDefinedBlockColor(block.blockSubtype) : "blue")
    }))
  ), [blocks]);

  const updateXaxis = useCallback((newMin: number, newMax: number): void => {
    const totalRange = todayMs - startDayMs;
    let width = newMax - newMin;

    const minZoomMs = 1000 * 60 * 60 * 24 * 7;
    width = Math.max(minZoomMs, Math.min(width, totalRange));

    newMin = Math.max(startDayMs, Math.min(newMin, todayMs - width));
    newMax = newMin + width;

    setSelection({xaxis: {min: newMin, max: newMax}});
  }, [startDayMs, todayMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hasSeenHint = window.localStorage.getItem('dashboard-chart-gesture-hint-seen') === 'true';
    setShowGestureHint(!hasSeenHint);
  }, []);

  const dismissGestureHint = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('dashboard-chart-gesture-hint-seen', 'true');
    }
    setShowGestureHint(false);
  }, []);

  return (
    <Box sx={{height: '100%'}}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {xs: '1fr', md: 'repeat(3, minmax(0, 1fr))'},
          gap: 1.5,
        }}
      >
        {METRIC_CONFIGS.map(metric => {
          const data = getData(metric.key);
          const series: Series[] = data.length > 0
            ? metric.key === 'weight'
              ? [
                {name: metric.label, data, yAxisIndex: 0},
                {name: 'Weight trend (7-day avg)', data: buildRollingAverageSeries(data, WEIGHT_TREND_WINDOW), yAxisIndex: 0},
              ]
              : [{name: metric.label, data, yAxisIndex: 0}]
            : [{name: 'invisible', data: [[startDayMs, null], [todayMs, null]], yAxisIndex: 0}];

          return (
            <MetricChartCard
              key={metric.key}
              metric={metric}
              bodyweightUnit={bodyweightUnit}
              series={series}
              selection={selection}
              chartBlocks={chartBlocks}
              startDayMs={startDayMs}
              todayMs={todayMs}
              updateXaxis={updateXaxis}
            />
          );
        })}
      </Box>

      <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column', mt: 0.5}}>
        {showGestureHint ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 1.5,
              py: 0.75,
              borderRadius: 1,
              bgcolor: 'action.hover',
              mb: 1,
            }}
          >
            <Typography variant="caption">
              Tip: Drag to pan and wheel/pinch to zoom.
            </Typography>
            <Button size="small" onClick={dismissGestureHint}>Got it</Button>
          </Box>
        ) : null}

      </Box>
    </Box>
  );
}
