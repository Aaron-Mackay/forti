"use client";
import React from "react";
import {Box, Drawer} from "@mui/material";
import {MetricInput} from "@/app/user/calendar/MetricInput";
import {MetricKey} from "@/app/user/calendar/MetricBar";
import {MetricPrisma} from "@/types/dataTypes";
import {CustomMetricDef} from "@/types/settingsTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  selectedMetric: MetricKey | null;
  setSelectedMetric: (m: MetricKey | null) => void;
  inputValue: string | number | null;
  setInputValue: (v: string | number | null) => void;
  dateMetric: MetricPrisma | null | undefined;
  date: Date;
  userId: string;
  setMetricStateCb: (date: Date, metric: MetricPrisma | null) => void;
  customMetricDefs?: CustomMetricDef[];
};

export default function MetricDrawer({
  open,
  onClose,
  selectedMetric,
  setSelectedMetric,
  inputValue,
  setInputValue,
  dateMetric,
  date,
  userId,
  setMetricStateCb,
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
        <MetricInput
          setSelectedMetric={setSelectedMetric}
          selectedMetric={selectedMetric}
          setInputValue={setInputValue}
          inputValue={inputValue}
          dateMetric={dateMetric}
          selectedDate={date}
          userId={userId}
          setMetricStateCb={setMetricStateCb}
          hideBack
          customMetricDefs={customMetricDefs}
        />
      </Box>
    </Drawer>
  );
}
