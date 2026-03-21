'use client';

import React, {useState} from 'react';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  IconButton,
  Skeleton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Settings, CustomMetricDef } from '@/types/settingsTypes';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';
import { useSettings } from '@lib/providers/SettingsProvider';
import CoachingSettings from './CoachingSettings';

type BooleanSettingKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

function CustomMetricsSection() {
  const { settings, updateCustomMetrics } = useSettings();
  const [defs, setDefs] = useState<CustomMetricDef[]>(settings.customMetrics);

  // Keep local state in sync when settings load asynchronously
  React.useEffect(() => {
    setDefs(settings.customMetrics);
  }, [settings.customMetrics]);

  const saveDefs = (next: CustomMetricDef[]) => {
    setDefs(next);
    updateCustomMetrics(next);
  };

  const handleNameBlur = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    saveDefs(defs.map(d => d.id === id ? { ...d, name: trimmed } : d));
  };

  const handleDelete = (id: string) => {
    saveDefs(defs.filter(d => d.id !== id));
  };

  const handleAdd = () => {
    if (defs.length >= 5) return;
    const newDef: CustomMetricDef = {
      id: crypto.randomUUID(),
      name: `Metric ${defs.length + 1}`,
    };
    saveDefs([...defs, newDef]);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Track up to 5 personal measurements alongside your daily metrics
      </Typography>
      {defs.map(def => (
        <Box key={def.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextField
            defaultValue={def.name}
            size="small"
            sx={{ flex: 1 }}
            onBlur={e => handleNameBlur(def.id, e.target.value)}
          />
          <IconButton
            size="small"
            onClick={() => handleDelete(def.id)}
            aria-label={`Delete ${def.name}`}
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      <Button
        startIcon={<AddIcon />}
        size="small"
        onClick={handleAdd}
        disabled={defs.length >= 5}
        sx={{ mt: 0.5 }}
      >
        Add metric
      </Button>
    </Box>
  );
}

const CARD_LABELS: {key: BooleanSettingKey; label: string}[] = [
  {key: 'showNextWorkout',    label: 'Next Workout'},
  {key: 'showTodaysMetrics',  label: "Today's Metrics"},
  {key: 'showWeeklyTraining', label: 'Weekly Training'},
  {key: 'showActiveBlock',    label: 'Active Block'},
  {key: 'showUpcomingEvents', label: 'Upcoming Events'},
  {key: 'showMetricsChart',   label: 'Metrics Chart'},
];

const WORKOUT_LABELS: {key: BooleanSettingKey; label: string}[] = [
  {key: 'showStopwatch', label: 'Stopwatch'}
];

const FEATURE_LABELS: {key: BooleanSettingKey; label: string}[] = [
  {key: 'showSupplements', label: 'Supplements'},
];

export default function SettingsClient() {
  const { settings, loading, error, clearError, updateSetting } = useSettings();

  const handleToggle = (key: BooleanSettingKey) => {
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

      <Divider sx={{my: 3}}/>

      <Typography variant="overline" color="text.secondary">Features</Typography>
      <Box sx={{mb: 2}}>
        {FEATURE_LABELS.map(({key, label}, i) => (
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

      <Divider sx={{my: 3}}/>

      <Typography variant="overline" color="text.secondary">Custom Metrics</Typography>
      <Box sx={{mb: 2}}>
        <CustomMetricsSection />
      </Box>

      <Divider sx={{my: 3}}/>

      <Typography variant="overline" color="text.secondary">Check-in</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Day of the week for your weekly check-in
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={40} />
      ) : (
        <ToggleButtonGroup
          value={settings.checkInDay}
          exclusive
          onChange={(_e, val) => { if (val !== null) updateSetting('checkInDay', val as number); }}
          size="small"
          sx={{ flexWrap: 'wrap', gap: 0.5, mb: 2 }}
        >
          {CHECK_IN_DAY_NAMES.map((name, i) => (
            <ToggleButton key={i} value={i} sx={{ flex: '1 1 auto', minWidth: 44 }}>
              {name.slice(0, 3)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Divider sx={{my: 3}}/>

      <Typography variant="overline" color="text.secondary">Onboarding</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Re-show the Getting Started guide on your dashboard.
      </Typography>
      <Button
        variant="outlined"
        size="small"
        onClick={() => updateSetting('onboardingDismissed', false)}
      >
        Show Getting Started guide
      </Button>

      <Divider sx={{my: 3}}/>
      <CoachingSettings />
    </Box>
  );
}
