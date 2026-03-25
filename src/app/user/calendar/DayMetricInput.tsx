import React, {useEffect, useRef, useState} from "react";
import {MetricKey, getCustomMetricsData} from "@/app/user/calendar/DayMetricBar";
import {Box, IconButton, TextField, Typography} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {hhMmToMin, minToHhMm} from "@/app/user/calendar/utils";
import Button from "@mui/material/Button";
import {DayMetricPrisma} from "@/types/dataTypes";
import {updateDayMetricClient} from "@lib/dayMetrics";
import {CustomMetricDef, WeightUnit} from "@/types/settingsTypes";

const BUILTIN_KEYS = new Set<MetricKey>(['weight', 'calories', 'steps', 'sleepMins']);

export const DayMetricInput: React.FC<{
  setSelectedMetric: (metric: MetricKey | null) => void;
  selectedMetric: MetricKey | null;
  setInputValue: (value: string | number | null) => void;
  inputValue: string | number | null;
  dateDayMetrics: DayMetricPrisma | null | undefined;
  selectedDate: Date | null;
  userId: string;
  setDayMetricsStateCb: (date: Date, metrics: DayMetricPrisma | null) => void;
  hideBack?: boolean;
  customMetricDefs?: CustomMetricDef[];
  weightUnit?: WeightUnit;
}> = ({
        setSelectedMetric,
        selectedMetric,
        setInputValue,
        inputValue,
        dateDayMetrics,
        selectedDate,
        userId,
        setDayMetricsStateCb,
        hideBack = false,
        customMetricDefs = [],
        weightUnit = 'kg',
      }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [targetValue, setTargetValue] = useState<string>('');

  const isCustom = selectedMetric !== null && !BUILTIN_KEYS.has(selectedMetric);
  const customDef = isCustom ? customMetricDefs.find(d => d.id === selectedMetric) : undefined;

  useEffect(() => {
    if (selectedMetric) {
      setTimeout(() => inputRef.current?.focus(), 300);
      if (!BUILTIN_KEYS.has(selectedMetric)) {
        const customData = getCustomMetricsData(dateDayMetrics?.customMetrics);
        const existing = customData[selectedMetric];
        setTargetValue(existing?.target != null ? String(existing.target) : '');
      }
    }
  }, [selectedMetric]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = () => {
    if (!selectedDate || !selectedMetric) {
      console.warn("handleSubmit called with null selectedDate or selectedMetric");
      return;
    }
    const fallbackMetrics = dateDayMetrics ? {...dateDayMetrics} : null;

    let updatedMetrics: DayMetricPrisma;

    if (isCustom) {
      const existingData = getCustomMetricsData(dateDayMetrics?.customMetrics);
      const updatedData = {
        ...existingData,
        [selectedMetric]: {
          value: inputValue !== '' && inputValue !== null ? Number(inputValue) : null,
          target: targetValue !== '' ? Number(targetValue) : (existingData[selectedMetric]?.target ?? null),
        },
      };
      updatedMetrics = {
        ...(dateDayMetrics as DayMetricPrisma),
        date: selectedDate,
        userId: userId,
        customMetrics: updatedData as DayMetricPrisma['customMetrics'],
      };
    } else {
      updatedMetrics = {
        ...(dateDayMetrics as DayMetricPrisma),
        date: selectedDate,
        userId: userId,
        [selectedMetric]: selectedMetric === 'sleepMins' ? inputValue : Number(inputValue),
      };
    }

    setDayMetricsStateCb(selectedDate, updatedMetrics);

    updateDayMetricClient(updatedMetrics)
      .then(() => setSelectedMetric(null))
      .catch(() => {
        alert("Failed to update value");
        setDayMetricsStateCb(selectedDate, fallbackMetrics || null);
      });
  };

  const displayLabel = selectedMetric === 'weight'
    ? `weight (${weightUnit})`
    : selectedMetric === 'sleepMins'
    ? 'sleep'
    : (customDef?.name ?? selectedMetric ?? '');

  return (<>
    {!hideBack && (
      <IconButton
        onClick={() => setSelectedMetric(null)}
        sx={{position: 'absolute', top: 8, left: 8, zIndex: 1}}
        aria-label="Back"
      >
        <ArrowBackIcon/>
      </IconButton>
    )}
    <Box sx={{display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 1}}>
      <Typography variant="subtitle1" mb={1}>Update {displayLabel}</Typography>
      <Box sx={{display: 'flex', flexDirection: 'row', gap: 2, width: '100%'}}>
        {selectedMetric === 'sleepMins' ? (
          <TextField label="Enter Sleep Time"
                     type={"time"}
                     value={(inputValue && minToHhMm(Number(inputValue))) ?? ""}
                     onChange={(e) => setInputValue(hhMmToMin(e.target.value))}
                     sx={{mb: 2, width: '100%'}}
                     inputRef={inputRef}
          />
        ) : isCustom ? (
          <Box sx={{display: 'flex', flexDirection: 'column', gap: 1, flex: 1}}>
            <TextField
              type='number'
              label={`Value`}
              value={inputValue ?? ""}
              onChange={(e) => setInputValue(e.target.value)}
              sx={{width: '100%'}}
              inputRef={inputRef}
            />
            <TextField
              type='number'
              label={`Target (optional)`}
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
              sx={{width: '100%'}}
            />
          </Box>
        ) : (
          <TextField
            type={'number'}
            label={`Enter ${selectedMetric}`}
            value={inputValue ?? ""}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{mb: 2, width: '100%'}}
            inputRef={inputRef}
          />
        )}

        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={inputValue === null}
          sx={{flex: isCustom ? 'none' : 1, height: isCustom ? '100%' : '56px', alignSelf: isCustom ? 'flex-end' : 'auto'}}
        >
          Save
        </Button>
      </Box>
    </Box>
  </>);
};
