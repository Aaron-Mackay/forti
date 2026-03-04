'use client';

import React, {useEffect, useState} from 'react';
import {
  Alert,
  Box,
  Divider,
  FormControlLabel,
  Skeleton,
  Switch,
  Typography,
} from '@mui/material';
import {DashboardSettings, DEFAULT_DASHBOARD_SETTINGS, parseDashboardSettings} from '@/types/settingsTypes';

const CARD_LABELS: {key: keyof DashboardSettings; label: string}[] = [
  {key: 'showNextWorkout',    label: 'Next Workout'},
  {key: 'showTodaysMetrics',  label: "Today's Metrics"},
  {key: 'showWeeklyTraining', label: 'Weekly Training'},
  {key: 'showActiveBlock',    label: 'Active Block'},
  {key: 'showUpcomingEvents', label: 'Upcoming Events'},
  {key: 'showMetricsChart',   label: 'Metrics Chart'},
];

export default function SettingsClient() {
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_DASHBOARD_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/user/settings')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        setSettings(parseDashboardSettings(data.settings));
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to load settings.');
        setLoading(false);
      });
  }, []);

  const handleToggle = async (key: keyof DashboardSettings) => {
    const prev = settings;
    const updated = {...settings, [key]: !settings[key]};
    setSettings(updated);
    setError(null);

    try {
      const res = await fetch('/api/user/settings', {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({settings: {[key]: updated[key]}}),
      });
      if (!res.ok) throw new Error();
    } catch {
      setSettings(prev);
      setError('Failed to save setting. Please try again.');
    }
  };

  return (
    <Box sx={{pt: 2, pb: 4, maxWidth: 480}}>
      <Typography variant="h5" sx={{mb: 3}}>Settings</Typography>

      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="overline" color="text.secondary">Dashboard Cards</Typography>
      <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
        Choose which sections appear on your dashboard.
      </Typography>

      <Box>
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
    </Box>
  );
}
