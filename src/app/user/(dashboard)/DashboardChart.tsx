'use client'

import dynamic from "next/dynamic";
import React, {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Box, Button, ButtonGroup, Skeleton} from "@mui/material";
import {addDays, subDays, subMonths} from "date-fns";
import {MetricPrisma, EventPrisma} from "@/types/dataTypes";
import {BuiltInMetricKey} from "@/app/user/calendar/MetricBar";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";
import {DataPoint, Series} from "@/app/user/(dashboard)/utils";
import {GestureHandlers, useGesture} from "@use-gesture/react";

import WeightIcon from '@mui/icons-material/Scale';
import FoodIcon from '@mui/icons-material/RestaurantRounded';
import StepsIcon from '@mui/icons-material/DirectionsWalkRounded';

const CHART_HEIGHT = 350;

const Chart = dynamic(
  () => import("react-apexcharts").catch(() => ({ default: () => null })),
  {
    ssr: false,
    loading: () => <Skeleton variant="rounded" height={CHART_HEIGHT - 15} sx={{my: '15px'}}/>
  }
);

type Selection = {
  xaxis: { min: number; max: number };
}

export default function DashboardChart({metrics = [], blocks = []}: { metrics: MetricPrisma[], blocks: EventPrisma[] }) {
  const [selectedMetrics, setSelectedMetrics] = useState<BuiltInMetricKey[]>(['weight']);
  const metricLabelify = (metricKey: BuiltInMetricKey): string => metricKey[0].toUpperCase() + metricKey.slice(1);

  const getData = useCallback(
    (metric: BuiltInMetricKey): DataPoint[] =>
      metrics
        .filter(dm => dm[metric] !== null)
        .map(dm => [new Date(dm.date).getTime(), dm[metric]]),
    [metrics]
  );


  const today: Date = useMemo(() => new Date(), [])
  const startDay =
    metrics[0]?.date
    ?? blocks[0]?.startDate
    ?? subMonths(today, 7);
  const ranges = [
    {label: "1W", min: subDays(today, 7).getTime(), max: today.getTime()},
    {label: "1M", min: subMonths(today, 1).getTime(), max: today.getTime()},
    {label: "3M", min: subMonths(today, 3).getTime(), max: today.getTime()},
    {label: "6M", min: subMonths(today, 6).getTime(), max: today.getTime()},
    {label: "All", min: startDay.getTime(), max: today.getTime()},
  ];

  const [selection, setSelection] = useState<Selection>({
    xaxis: {min: subMonths(today, 1).getTime(), max: today.getTime()}
  });

  // if user has no metrics recorded, add an invisible series or blocks don't show
  const series = useMemo<Series[]>(() => {
    if (metrics.length === 0 || selectedMetrics.length === 0) {
      return [{
        name: "invisible",
        data: [[startDay.getTime(), null], [today.getTime(), null]],
        yAxisIndex: 0,
      }];
    }
    return selectedMetrics.map((metricKey, i) => ({
      name: metricLabelify(metricKey),
      data: getData(metricKey),
      yAxisIndex: i as 0 | 1,
    }));
  }, [metrics.length, getData, selectedMetrics, startDay, today]);

  const isActiveRange = (min: number, max: number) => {
    const tol = 1000 * 60 * 60 * 12;
    return Math.abs(selection.xaxis.min - min) < tol && Math.abs(selection.xaxis.max - max) < tol;
  };

  const chartBlocks = useMemo(() => (
    blocks.map(block => ({
      name: block.name,
      start: block.startDate.getTime(),
      end: addDays(block.endDate, 1).getTime(),
      color: block.customColor ?? (block.blockSubtype ? getDefinedBlockColor(block.blockSubtype) : "blue")
    }))
  ), [blocks]);

  const formatLabel = (val: number, metricKey: BuiltInMetricKey): string => {
    switch (metricKey) {
      case 'weight':
        return val.toPrecision(3);  // 3 significant figures
      case 'calories':
      case 'steps':
        return val.toFixed(0);
      default:
        return val.toString();
    }
  }


  const mainOptions: ApexCharts.ApexOptions = {
    chart: {
      id: "main-chart",
      type: "line",
      height: CHART_HEIGHT,
      zoom: {enabled: false},
      animations: {enabled: false},
      events: {
        zoomed: (_, ctx) => ctx && setSelection({xaxis: ctx.xaxis})
      },
      toolbar: {
        show: false
      }
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
    colors: ['#00a2f1', '#d30bff'],
    xaxis: {type: "datetime", min: selection.xaxis.min, max: selection.xaxis.max},
    yaxis: [
      {
        title: {text: metricLabelify(selectedMetrics[0] ?? 'Metric')},
        labels: {formatter: val => formatLabel(val, selectedMetrics[0])},
      },
      {
        title: {text: metricLabelify(selectedMetrics[1] ?? 'Metric')},
        labels: {formatter: val => formatLabel(val, selectedMetrics[1])},
        show: selectedMetrics.length > 1,
        opposite: true
      }
    ],
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

  const chartRef = useRef<HTMLDivElement>(null);
  const pinchRef = useRef<{ startWidth?: number, centerMs?: number }>({});

  const chartMetrics = useCallback(() => {
    if (!chartRef.current) return {chartWidthPx: 1, msPerPixel: 1, pxPerMs: 1, visibleMs: 1};
    const chartWidthPx = chartRef.current.offsetWidth;
    const visibleMs = selection.xaxis.max - selection.xaxis.min;
    return {
      chartWidthPx,
      visibleMs,
      msPerPixel: visibleMs / chartWidthPx,
      pxPerMs: chartWidthPx / visibleMs
    };
  }, [selection]);

  const updateXaxis = useCallback((newMin: number, newMax: number): void => {
    const totalRange = today.getTime() - startDay.getTime();
    let width = newMax - newMin;

    const minZoomMs = 1000 * 60 * 60 * 24 * 7; // 1 week
    width = Math.max(minZoomMs, Math.min(width, totalRange));

    newMin = Math.max(startDay.getTime(), Math.min(newMin, today.getTime() - width));
    newMax = newMin + width;

    setSelection({xaxis: {min: newMin, max: newMax}});
  }, [today, startDay]);


  // --- Wheel zoom (desktop) ---
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
    const {msPerPixel} = chartMetrics()

    const deltaMs = -dx * msPerPixel;
    setSelection(prev => {
      const totalRange = today.getTime() - startDay.getTime();
      const width = prev.xaxis.max - prev.xaxis.min;
      if (width >= totalRange) return prev; // don’t allow drag
      const newMin = Math.max(startDay.getTime(), Math.min(prev.xaxis.min + deltaMs, today.getTime() - width));
      const newMax = newMin + width;
      return {xaxis: {min: newMin, max: newMax}};
    });
  }

// --- Pinch handler ---
  const onPinch: GestureHandlers['onPinch'] = ({first, origin: [ox], movement: [mscale]}) => {
    const {chartWidthPx, visibleMs} = chartMetrics();

    if (first) {
      pinchRef.current.startWidth = visibleMs;
      pinchRef.current.centerMs = selection.xaxis.min + (ox / chartWidthPx) * visibleMs;
    }

    const startWidth = pinchRef.current.startWidth!;
    const centerMs = pinchRef.current.centerMs!;

    let newWidth = startWidth / mscale;

    // Clamp zoom
    const minZoomMs = 1000 * 60 * 60 * 24 * 7;
    const maxZoomMs = today.getTime() - startDay.getTime();
    newWidth = Math.max(minZoomMs, Math.min(newWidth, maxZoomMs));

    // Center around pinch point
    let newMin = centerMs - (centerMs - selection.xaxis.min) / visibleMs * newWidth;
    let newMax = newMin + newWidth;

    // Clamp to total range
    if (newMin < startDay.getTime()) {
      newMin = startDay.getTime();
      newMax = newMin + newWidth;
    }
    if (newMax > today.getTime()) {
      newMax = today.getTime();
      newMin = newMax - newWidth;
    }

    setSelection({xaxis: {min: newMin, max: newMax}});
  };

  const bindGestures = useGesture(
    {onDrag, onPinch},
    {drag: {axis: 'x'}, pinch: {scaleBounds: {min: 0.1, max: 10}}}
  );

  const toggleSelectedMetric = (e: React.MouseEvent<HTMLButtonElement>) => {
    const clickedBuiltInMetricKey = e.currentTarget.value as BuiltInMetricKey
    setSelectedMetrics(prevState => {
      if (prevState.includes(clickedBuiltInMetricKey)) {
        return prevState.filter(mk => mk != clickedBuiltInMetricKey)
      }
      if (prevState.length > 1 && !prevState.includes(clickedBuiltInMetricKey)) {
        return prevState
      }
      return [...prevState, clickedBuiltInMetricKey]
    })
  }

  return (
    <Box sx={{height: '100%'}}>
      <Box ref={chartRef} sx={{position: 'relative', touchAction: 'none', zIndex: 0}}>
        <Chart options={mainOptions} series={series} type="line" height={CHART_HEIGHT}/>
        {/* Transparent overlay to capture gestures */}
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


      <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column', mt: -1}}>
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
