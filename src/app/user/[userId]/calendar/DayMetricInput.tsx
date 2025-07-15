import React, {useEffect, useRef} from "react";
import {MetricKey} from "@/app/user/[userId]/calendar/DayMetricBar";
import {Box, IconButton, TextField, Typography} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {hhMmToMin, minToHhMm} from "@/app/user/[userId]/calendar/utils";
import Button from "@mui/material/Button";
import {DayMetricPrisma} from "@/types/dataTypes";
import {updateDayMetricClient} from "@lib/dayMetrics";

export const DayMetricInput: React.FC<{
  setSelectedMetric: (metric: MetricKey | null) => void;
  selectedMetric: MetricKey | null;
  setInputValue: (value: string | number | null) => void;
  inputValue: string | number | null;
  dateDayMetrics: DayMetricPrisma | null | undefined;
  selectedDate: Date | null;
  userId: string;
  setDayMetricsStateCb: (date: Date, metrics: DayMetricPrisma | null) => void;
}> = ({
        setSelectedMetric,
        selectedMetric,
        setInputValue,
        inputValue,
        dateDayMetrics,
        selectedDate,
        userId,
        setDayMetricsStateCb
      }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedMetric) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [selectedMetric])

  const handleSubmit = () => {
    if (!selectedDate || !selectedMetric) {
      console.warn("handleSubmit called with null selectedDate or selectedMetric");
      return;
    }
    const fallbackMetrics = dateDayMetrics ? {...dateDayMetrics} : null;

    const updatedMetrics: DayMetricPrisma = {
      ...(dateDayMetrics as DayMetricPrisma),
      date: selectedDate,
      userId: Number(userId),
      [selectedMetric]: selectedMetric === 'sleepMins' ? inputValue : Number(inputValue)
    };

    setDayMetricsStateCb(selectedDate, updatedMetrics);

    updateDayMetricClient(updatedMetrics)
      .then(() => setSelectedMetric(null))
      .catch(() => {
        alert("Failed to update value")
        setDayMetricsStateCb(selectedDate, fallbackMetrics || null)
      })
  }

  return (<>
    <IconButton
      onClick={() => setSelectedMetric(null)}
      sx={{position: 'absolute', top: 8, left: 8, zIndex: 1}}
      aria-label="Back"
    >
      <ArrowBackIcon/>
    </IconButton>
    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1}}>
      <Typography variant="subtitle1" mb={1}>Update {selectedMetric}</Typography>
      <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, width: '100%'}}>
        {selectedMetric === 'sleepMins' ?
          <TextField label="Enter Sleep Time"
                     type={"time"}
                     value={(inputValue && minToHhMm(Number(inputValue))) ?? ""}
                     onChange={(e) => setInputValue(hhMmToMin(e.target.value))}
                     sx={{mb: 2, width: '100%'}}
                     inputRef={inputRef}
          />
          : <TextField
            type={'number'}
            label={`Enter ${selectedMetric}`}
            value={inputValue ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{mb: 2, width: '100%'}}
            inputRef={inputRef}
          />}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={inputValue === null}
          sx={{flex: 1, height: "56px"}}
        >
          Save
        </Button>
      </Box>
    </Box>
  </>)
}