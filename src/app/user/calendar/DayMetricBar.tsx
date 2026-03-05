import React from "react";
import {Box, ButtonBase, Typography} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import {DayMetricPrisma} from "@/types/dataTypes";
import WeightIcon from '@mui/icons-material/Scale';
import FoodIcon from '@mui/icons-material/RestaurantRounded';
import StepsIcon from '@mui/icons-material/DirectionsWalkRounded';
import SleepIcon from '@mui/icons-material/HotelRounded';
import {minToHhMm} from "@/app/user/calendar/utils";

export type MetricKey = keyof DayMetricPrisma

const DayMetricButton = ({
                           icon,
                           value,
                           onClick,
                         }: {
  icon: React.ReactNode;
  value: boolean | string | number | null | undefined;
  onClick?: () => void;
}) => (
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
      bgcolor: value !== null ? "grey.100" : "grey.200",
      py: 1,
      px: 0.5,
      minHeight: "3.5rem",
    }}
  >
    {icon}
    {value ? (
      <Typography variant="caption" lineHeight={1}>{value}</Typography>
    ) : (
      <AddRoundedIcon sx={{fontSize: "1rem"}}/>
    )}
  </ButtonBase>
);


export const DayMetricsBar: React.FC<{
  dateDayMetrics: DayMetricPrisma | null | undefined,
  setSelectedMetric: (m: MetricKey) => void,
  setInputValue: (v: string | number | null) => void
}> = ({
        dateDayMetrics,
        setSelectedMetric,
        setInputValue
      }) => {
  const {weight = null, calories = null, steps = null, sleepMins = null} = dateDayMetrics || {};
  return (
    <Box display="flex" gap={1} alignItems="center" mb={1}>
      <DayMetricButton value={weight} icon={<WeightIcon/>} onClick={() => {
        setSelectedMetric('weight')
        setInputValue(weight)
      }}/>
      <DayMetricButton value={calories} icon={<FoodIcon/>} onClick={() => {
        setSelectedMetric('calories')
        setInputValue(calories)
      }}/>
      <DayMetricButton value={steps} icon={<StepsIcon/>} onClick={() => {
        setSelectedMetric('steps')
        setInputValue(steps)
      }}/>
      <DayMetricButton value={sleepMins && minToHhMm(sleepMins)} icon={<SleepIcon/>} onClick={() => {
        setSelectedMetric('sleepMins')
        setInputValue(sleepMins)
      }}/>
    </Box>
  );
}

export default DayMetricsBar;