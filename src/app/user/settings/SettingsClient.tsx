'use client';

import React from 'react';
import {
  Alert,
  Box,
  Divider,
  FormControlLabel,
  Skeleton,
  Switch,
  Typography,
} from '@mui/material';
import { Settings } from '@/types/settingsTypes';
import { useSettings } from '@lib/providers/SettingsProvider';

const CARD_LABELS: {key: keyof Settings; label: string}[] = [
  {key: 'showNextWorkout',    label: 'Next Workout'},
  {key: 'showTodaysMetrics',  label: "Today's Metrics"},
  {key: 'showWeeklyTraining', label: 'Weekly Training'},
  {key: 'showActiveBlock',    label: 'Active Block'},
  {key: 'showUpcomingEvents', label: 'Upcoming Events'},
  {key: 'showMetricsChart',   label: 'Metrics Chart'},
];

const WORKOUT_LABELS: {key: keyof Settings; label: string}[] = [
  {key: 'showStopwatch', label: 'Stopwatch'}
];

export default function SettingsClient() {
  const { settings, loading, error, clearError, updateSetting } = useSettings();

  const handleToggle = (key: keyof Settings) => {
    updateSetting(key, !settings[key]);
  };

  return (
    <Box sx={{pt: 2, pb: 4, maxWidth: 480}}>
      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={clearError}>
          {error}
        </Alert>
      )}

      <Typography variant="overline" color="text.secondary">Dashboard Cards</Typography>
      <Box sx={{mb: 2}}>
        {CARD_LABELS.map(({key, label}, i) => (
          <React.Fragment key={key}>
            {i > 0 && <Divider/>}
            {loading
              ? (
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1}}>
                  <Typography variant="body1">{label}</Typography>
                  <Skeleton variant="rounded" width={52} height={32}/>
                </Box>
              )
              : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings[key]}
                      onChange={() => handleToggle(key)}
                    />
                  }
                  label={label}
                  labelPlacement="start"
                  sx={{width: '100%', mx: 0, justifyContent: 'space-between'}}
                />
              )
            }
          </React.Fragment>
        ))}
      </Box>

      <Typography variant="overline" color="text.secondary">Workout</Typography>
      <Box>
        {WORKOUT_LABELS.map(({key, label}, i) => (
          <React.Fragment key={key}>
            {i > 0 && <Divider/>}
            {loading
              ? (
                <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1}}>
                  <Typography variant="body1">{label}</Typography>
                  <Skeleton variant="rounded" width={52} height={32}/>
                </Box>
              )
              : (
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings[key]}
                      onChange={() => handleToggle(key)}
                    />
                  }
                  label={label}
                  labelPlacement="start"
                  sx={{width: '100%', mx: 0, justifyContent: 'space-between'}}
                />
              )
            }
          </React.Fragment>
        ))}
      </Box>
    </Box>
  );
}
