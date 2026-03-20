"use client";
import React from "react";
import {Box, Drawer} from "@mui/material";
import {DayMetricInput} from "@/app/user/calendar/DayMetricInput";
import {MetricKey} from "@/app/user/calendar/DayMetricBar";
import {DayMetricPrisma} from "@/types/dataTypes";
import {CustomMetricDef} from "@/types/settingsTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedMetric: MetricKey | null;
  setSelectedMetric: (m: MetricKey | null) => void;
  inputValue: string | number | null;
  setInputValue: (v: string | number | null) => void;
  dateDayMetrics: DayMetricPrisma | null | undefined;
  date: Date;
  userId: string;
  setDayMetricsStateCb: (date: Date, metrics: DayMetricPrisma | null) => void;
  customMetricDefs?: CustomMetricDef[];
};

export default function DayMetricDrawer({
  open,
  onClose,
  selectedMetric,
  setSelectedMetric,
  inputValue,
  setInputValue,
  dateDayMetrics,
  date,
  userId,
  setDayMetricsStateCb,
  customMetricDefs = [],
}: Props) {
  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            borderTopLeftRadius: 16,
            borderTopRightRadius: 16,
            overflow: "hidden",
          },
        },
      }}
    >
      <Box sx={{p: 2, position: "relative"}}>
        <DayMetricInput
          setSelectedMetric={setSelectedMetric}
          selectedMetric={selectedMetric}
          setInputValue={setInputValue}
          inputValue={inputValue}
          dateDayMetrics={dateDayMetrics}
          selectedDate={date}
          userId={userId}
          setDayMetricsStateCb={setDayMetricsStateCb}
          hideBack
          customMetricDefs={customMetricDefs}
        />
      </Box>
    </Drawer>
  );
}
