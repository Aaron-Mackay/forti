import React from "react";
import {Box, Button} from "@mui/material";
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
  <Button
    onClick={onClick}
    variant="outlined"
    sx={{borderRadius: 999, minWidth: "4rem", px: 1, py: 0}}
  >
    {icon}
    {value || <AddRoundedIcon/>}
  </Button>
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
    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
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