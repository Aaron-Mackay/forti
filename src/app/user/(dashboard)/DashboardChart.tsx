'use client'

import dynamic from "next/dynamic";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Button, ButtonGroup, Skeleton, Typography} from "@mui/material";
import {addDays, subDays, subMonths} from "date-fns";
import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import {BuiltInMetricKey} from "@/app/user/calendar/MetricBar";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";
import {DataPoint, Series} from "@/app/user/(dashboard)/utils";
import {GestureHandlers, useGesture} from "@use-gesture/react";

import WeightIcon from '@mui/icons-material/Scale';
import FoodIcon from '@mui/icons-material/RestaurantRounded';
import StepsIcon from '@mui/icons-material/DirectionsWalkRounded';

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

type MetricConfig = {
  key: BuiltInMetricKey;
  label: string;
  unitHint: string;
  color: string;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {key: 'weight', label: 'Weight', unitHint: 'kg/lb', color: '#00a2f1'},
  {key: 'calories', label: 'Calories', unitHint: 'kcal', color: '#d30bff'},
  {key: 'steps', label: 'Steps', unitHint: 'steps', color: '#2e7d32'},
];

const formatLabel = (val: number, metricKey: BuiltInMetricKey): string => {
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

type MetricChartCardProps = {
  metric: MetricConfig;
  series: Series[];
  selection: Selection;
  chartBlocks: { name: string; start: number; end: number; color: string }[];
  startDayMs: number;
  todayMs: number;
  setSelection: React.Dispatch<React.SetStateAction<Selection>>;
  updateXaxis: (newMin: number, newMax: number) => void;
}

function MetricChartCard({
  metric,
  series,
  selection,
  chartBlocks,
  startDayMs,
  todayMs,
  setSelection,
  updateXaxis
}: MetricChartCardProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startWidth?: number, centerMs?: number }>({});

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

      updateXaxis(newMin, newMax);
    };

    el.addEventListener('wheel', onWheelZoom, {passive: false});
    return () => el.removeEventListener('wheel', onWheelZoom);
  }, [chartMetrics, selection, updateXaxis]);

  const onDrag: GestureHandlers['onDrag'] = ({delta: [dx]}) => {
    const {msPerPixel} = chartMetrics();

    const deltaMs = -dx * msPerPixel;
    setSelection(prev => {
      const totalRange = todayMs - startDayMs;
      const width = prev.xaxis.max - prev.xaxis.min;
      if (width >= totalRange) return prev;
      const newMin = Math.max(startDayMs, Math.min(prev.xaxis.min + deltaMs, todayMs - width));
      const newMax = newMin + width;
      return {xaxis: {min: newMin, max: newMax}};
    });
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

    setSelection({xaxis: {min: newMin, max: newMax}});
  };

  const bindGestures = useGesture(
    {onDrag, onPinch},
    {drag: {axis: 'x'}, pinch: {scaleBounds: {min: 0.1, max: 10}}}
  );

  const chartOptions: ApexCharts.ApexOptions = {
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
      width: 2,
    },
    markers: {
      size: 3,
      shape: "diamond",
      colors: ['#000000'],
    },
    colors: [metric.color],
    xaxis: {type: "datetime", min: selection.xaxis.min, max: selection.xaxis.max},
    yaxis: {
      title: {text: metric.label},
      labels: {formatter: val => formatLabel(val, metric.key)},
    },
    tooltip: {x: {format: "yyyy-MM-dd"}},
    legend: {show: false},
    subtitle: {
      text: `Unit: ${metric.unitHint}`,
      align: 'left',
      offsetY: 6,
      style: {fontSize: '12px', fontWeight: 500},
    },
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
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          cursor: 'grab',
          zIndex: 10,
          backgroundColor: 'transparent',
        }}
      />
    </Box>
  );
}

export default function DashboardChart({metrics = [], blocks = []}: { metrics: MetricPrisma[], blocks: EventPrisma[] }) {
  const [selectedMetrics, setSelectedMetrics] = useState<BuiltInMetricKey[]>(['weight', 'calories', 'steps']);

  const getData = useCallback(
    (metric: BuiltInMetricKey): DataPoint[] =>
      metrics
        .filter(dm => dm[metric] !== null)
        .map(dm => [new Date(dm.date).getTime(), dm[metric]]),
    [metrics]
  );

  const today: Date = useMemo(() => new Date(), []);
  const startDay =
    metrics[0]?.date
    ?? blocks[0]?.startDate
    ?? subMonths(today, 7);
  const startDayMs = startDay.getTime();
  const todayMs = today.getTime();

  const ranges = [
    {label: "1W", min: subDays(today, 7).getTime(), max: todayMs},
    {label: "1M", min: subMonths(today, 1).getTime(), max: todayMs},
    {label: "3M", min: subMonths(today, 3).getTime(), max: todayMs},
    {label: "6M", min: subMonths(today, 6).getTime(), max: todayMs},
    {label: "All", min: startDayMs, max: todayMs},
  ];

  const [selection, setSelection] = useState<Selection>({
    xaxis: {min: subMonths(today, 1).getTime(), max: todayMs}
  });

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

  const isActiveRange = (min: number, max: number) => {
    const tol = 1000 * 60 * 60 * 12;
    return Math.abs(selection.xaxis.min - min) < tol && Math.abs(selection.xaxis.max - max) < tol;
  };

  const toggleSelectedMetric = (e: React.MouseEvent<HTMLButtonElement>) => {
    const clickedBuiltInMetricKey = e.currentTarget.value as BuiltInMetricKey;
    setSelectedMetrics(prevState => (
      prevState.includes(clickedBuiltInMetricKey)
        ? prevState.filter(mk => mk !== clickedBuiltInMetricKey)
        : [...prevState, clickedBuiltInMetricKey]
    ));
  }

  const visibleMetrics = METRIC_CONFIGS.filter(metric => selectedMetrics.includes(metric.key));

  return (
    <Box sx={{height: '100%'}}>
      {visibleMetrics.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
          Select at least one metric to show a chart.
        </Typography>
      )}

      {visibleMetrics.map(metric => {
        const data = getData(metric.key);
        const series: Series[] = data.length > 0
          ? [{name: metric.label, data, yAxisIndex: 0}]
          : [{name: 'invisible', data: [[startDayMs, null], [todayMs, null]], yAxisIndex: 0}];

        return (
          <MetricChartCard
            key={metric.key}
            metric={metric}
            series={series}
            selection={selection}
            chartBlocks={chartBlocks}
            startDayMs={startDayMs}
            todayMs={todayMs}
            setSelection={setSelection}
            updateXaxis={updateXaxis}
          />
        );
      })}

      <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column', mt: 0.5}}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} gap={1}>
          <Button
            value={'weight'}
            onClick={toggleSelectedMetric}
            variant={selectedMetrics.includes('weight') ? "contained" : "outlined"}
            sx={{borderRadius: 999, minWidth: "2rem", px: 1, py: 0}}
          >
            <WeightIcon/>
          </Button>
          <Button
            value={'calories'}
            onClick={toggleSelectedMetric}
            variant={selectedMetrics.includes('calories') ? "contained" : "outlined"}
            sx={{borderRadius: 999, minWidth: "2rem", px: 1, py: 0}}
          >
            <FoodIcon/>
          </Button>
          <Button
            value={'steps'}
            onClick={toggleSelectedMetric}
            variant={selectedMetrics.includes('steps') ? "contained" : "outlined"}
            sx={{borderRadius: 999, minWidth: "2rem", px: 1, py: 0}}
          >
            <StepsIcon/>
          </Button>
        </Box>
        <ButtonGroup>
          {ranges.map(r => (
            <Button
              key={r.label}
              onClick={() => setSelection({xaxis: {min: r.min, max: r.max}})}
              variant={isActiveRange(r.min, r.max) ? "contained" : "outlined"}
            >
              {r.label}
            </Button>
          ))}
        </ButtonGroup>
      </Box>
    </Box>
  );
}
