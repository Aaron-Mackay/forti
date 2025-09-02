'use client'

import dynamic from "next/dynamic";
import React, {useRef, useState} from "react";
import {Box, Button, ButtonGroup, Typography} from "@mui/material";
import {subDays, subMonths} from "date-fns";
import {DayMetricPrisma, EventPrisma} from "@/types/dataTypes";
import {MetricKey} from "@/app/user/calendar/DayMetricBar";
import {getDefinedBlockColor} from "@/app/user/calendar/utils";
import {DataPoint, extractGapSeries} from "@/app/user/(dashboard)/utils";
import {useDrag} from "@use-gesture/react";

const Chart = dynamic(() => import("react-apexcharts"), {ssr: false});

export default function DashboardChart({dayMetrics, blocks}: { dayMetrics: DayMetricPrisma[], blocks: EventPrisma[] }) {

  const metricKey: MetricKey = 'weight';
  const metricLabel: string = metricKey[0].toUpperCase() + metricKey.slice(1);

  const getData = (metric: MetricKey): DataPoint[] =>
    dayMetrics.map(dm => [new Date(dm.date).getTime(), dm[metric]]);

  const data = getData(metricKey);
  const gapSeries = extractGapSeries(data, metricLabel);

  const series = [
    ...gapSeries,
    {name: metricLabel, data},
  ];

  const today: Date = new Date();
  const startDay: Date = dayMetrics[0].date
  const ranges = [
    {label: "1W", min: subDays(today, 7).getTime(), max: today.getTime()},
    {label: "1M", min: subMonths(today, 1).getTime(), max: today.getTime()},
    {label: "3M", min: subMonths(today, 3).getTime(), max: today.getTime()},
    {label: "6M", min: subMonths(today, 6).getTime(), max: today.getTime()},
    {label: "All", min: startDay.getTime(), max: today.getTime()},
  ];

  const [selection, setSelection] = useState({
    xaxis: {min: subMonths(today, 1).getTime(), max: today.getTime()}
  });

  const isActiveRange = (min: number, max: number) => {
    const tol = 1000 * 60 * 60 * 12;
    return Math.abs(selection.xaxis.min - min) < tol && Math.abs(selection.xaxis.max - max) < tol;
  };

  const chartBlocks = blocks.map(block => ({
    name: block.name,
    start: block.startDate.getTime(),
    end: block.endDate.getTime(),
    color: block.customColor ?? (block.blockSubtype ? getDefinedBlockColor(block.blockSubtype) : "blue")
  }));

  const mainOptions: ApexCharts.ApexOptions = {
    chart: {
      id: "main-chart",
      type: "line",
      height: 350,
      zoom: {enabled: false},
      animations: {enabled: false},
      events: {
        zoomed: (_, {xaxis}) => setSelection({xaxis})
      }
    },
    stroke: {
      curve: "smooth",
      width: 2,
      dashArray: [...Array(gapSeries.length).fill(6), 0]
    },
    colors: ['#00a2f1'],
    xaxis: {type: "datetime", min: selection.xaxis.min, max: selection.xaxis.max},
    yaxis: {title: {text: metricLabel}},
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
  const bind = useDrag(({delta: [mx, _my]}) => {
    const visibleMs = selection.xaxis.max - selection.xaxis.min;
    const chartWidthPx = chartRef.current?.offsetWidth ?? 1;
    const msPerPixel = visibleMs / chartWidthPx;

    const deltaMs = -mx * msPerPixel;
    setSelection(prev => {
      const totalRange = today.getTime() - startDay.getTime();
      const width = prev.xaxis.max - prev.xaxis.min;
      if (width >= totalRange) return prev; // don’t allow drag
      const newMin = Math.max(startDay.getTime(), Math.min(prev.xaxis.min + deltaMs, today.getTime() - width));
      const newMax = newMin + width;
      return { xaxis: { min: newMin, max: newMax } };
    });
  }, {axis: 'x'})

  return (
    <Box sx={{height: '100%'}}>
      <Typography variant="h6" gutterBottom>
        Zoomable Chart with Phases
      </Typography>

      <Box ref={chartRef} sx={{position: 'relative', touchAction: 'none'}}>
        <Chart options={mainOptions} series={series} type="line" height={350}/>
        {/* Transparent overlay to capture drags */}
        <Box
          {...bind()} // useDrag bound here
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            cursor: 'grab',      // optional visual cue
            zIndex: 10,
            backgroundColor: 'transparent', // must be transparent
          }}
        />
      </Box>


      <Box sx={{display: 'flex', alignItems: 'center', flexDirection: 'column', mt: 2}}>
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
