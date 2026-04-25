import React from "react";
import {Box, ButtonBase, Typography} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {MetricPrisma} from "@/types/dataTypes";
import WeightIcon from '@mui/icons-material/Scale';
import FoodIcon from '@mui/icons-material/RestaurantRounded';
import StepsIcon from '@mui/icons-material/DirectionsWalkRounded';
import SleepIcon from '@mui/icons-material/HotelRounded';
import TuneIcon from '@mui/icons-material/TuneRounded';
import {minToHhMm} from "@/app/user/calendar/utils";
import {CustomMetricDef, WeightUnit} from "@/types/settingsTypes";
import {kgToDisplay} from "@/lib/units";
import type {Prisma} from "@/generated/prisma/browser";

import type { BuiltInMetricKey, MetricKey } from '@/types/metricTypes';
export type { BuiltInMetricKey, MetricKey };

interface CustomMetricEntry {
  value: number | null;
  target: number | null;
}

export function getCustomMetricsData(raw: Prisma.JsonValue | null | undefined): Record<string, CustomMetricEntry> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const result: Record<string, CustomMetricEntry> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const entry = v as Record<string, unknown>;
      result[k] = {
        value: typeof entry.value === 'number' ? entry.value : null,
        target: typeof entry.target === 'number' ? entry.target : null,
      };
    }
  }
  return result;
}

const MetricButton = ({
                           icon,
                           value,
                           onClick,
                         }: {
  icon: React.ReactNode;
  value: boolean | string | number | null | undefined;
  onClick?: () => void;
}) => {
  const isEmpty = value === null || value === undefined || value === '';
  return (
  <ButtonBase
    onClick={onClick}
    sx={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 0.25,
      borderRadius: 4,
      bgcolor: isEmpty ? "grey.200" : "grey.100",
      py: 1,
      px: 0.5,
      minHeight: "3.5rem",
    }}
  >
    {icon}
    {!isEmpty ? (
      <Typography variant="caption" lineHeight={1}>{value}</Typography>
    ) : (
      <AddRoundedIcon sx={{fontSize: "1rem"}}/>
    )}
  </ButtonBase>
  );
};


export const MetricsBar: React.FC<{
  dateMetric: MetricPrisma | null | undefined,
  setSelectedMetric: (m: MetricKey) => void,
  setInputValue: (v: string | number | null) => void,
  customMetricDefs?: CustomMetricDef[],
  weightUnit?: WeightUnit,
}> = ({
        dateMetric,
        setSelectedMetric,
        setInputValue,
        customMetricDefs = [],
        weightUnit = 'kg',
      }) => {
  const {weight = null, calories = null, steps = null, sleepMins = null} = dateMetric || {};
  const customData = getCustomMetricsData(dateMetric?.customMetrics);

  const weightDisplay = weight != null
    ? kgToDisplay(weight, weightUnit)
    : null;

  return (
    <Box display="flex" gap={1} alignItems="center" mb={1} flexWrap="wrap">
      <MetricButton value={weightDisplay} icon={<WeightIcon/>} onClick={() => {
        setSelectedMetric('weight')
        setInputValue(weight)
      }}/>
      <MetricButton value={calories} icon={<FoodIcon/>} onClick={() => {
        setSelectedMetric('calories')
        setInputValue(calories)
      }}/>
      <MetricButton value={steps} icon={<StepsIcon/>} onClick={() => {
        setSelectedMetric('steps')
        setInputValue(steps)
      }}/>
      <MetricButton value={sleepMins == null ? null : minToHhMm(sleepMins)} icon={<SleepIcon/>} onClick={() => {
        setSelectedMetric('sleepMins')
        setInputValue(sleepMins)
      }}/>
      {customMetricDefs.map(def => {
        const entry = customData[def.id];
        const val = entry?.value ?? null;
        return (
          <MetricButton
            key={def.id}
            value={val}
            icon={<TuneIcon/>}
            onClick={() => {
              setSelectedMetric(def.id);
              setInputValue(val);
            }}
          />
        );
      })}
    </Box>
  );
}
