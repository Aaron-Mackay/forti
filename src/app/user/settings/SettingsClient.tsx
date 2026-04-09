'use client';

import React, {useState} from 'react';
import {
  Alert,
  Autocomplete,
  Avatar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Skeleton,
  Switch,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { Settings, CustomMetricDef, TrackedE1rmExercise } from '@/types/settingsTypes';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';
import { useSettings } from '@lib/providers/SettingsProvider';
import { useExerciseList } from '@lib/hooks/api/useExerciseList';
import { Exercise } from '@/generated/prisma/browser';
import CoachingSettings from './CoachingSettings';

type BooleanSettingKey = { [K in keyof Settings]: Settings[K] extends boolean ? K : never }[keyof Settings];

function E1rmTrackingSection() {
  const { settings, updateTrackedE1rmExercises } = useSettings();
  const { exercises, loading } = useExerciseList(true);
  const [inputValue, setInputValue] = useState('');

  const tracked: TrackedE1rmExercise[] = settings.trackedE1rmExercises;
  const trackedIds = new Set(tracked.map(e => e.id));
  const available = exercises.filter((e: Exercise) => !trackedIds.has(e.id));

  const handleSelect = (_: React.SyntheticEvent, exercise: Exercise | null) => {
    if (!exercise || tracked.length >= 5) return;
    updateTrackedE1rmExercises([...tracked, { id: exercise.id, name: exercise.name }]);
    setInputValue('');
  };

  const handleRemove = (id: number) => {
    updateTrackedE1rmExercises(tracked.filter(e => e.id !== id));
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Select up to 5 exercises to track e1RM progress on your dashboard
      </Typography>
      <Autocomplete
        options={available}
        getOptionLabel={(option: Exercise) => option.name}
        loading={loading}
        disabled={tracked.length >= 5}
        onChange={handleSelect}
        value={null}
        inputValue={inputValue}
        onInputChange={(_e, val, reason) => {
          if (reason !== 'reset') setInputValue(val);
        }}
        renderInput={params => (
          <TextField {...params} placeholder="Search exercises…" size="small" />
        )}
        sx={{ mb: 1.5 }}
      />
      {tracked.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 0.5 }}>
          {tracked.map(e => (
            <Chip
              key={e.id}
              label={e.name}
              onDelete={() => handleRemove(e.id)}
              size="small"
            />
          ))}
        </Box>
      )}
      <Typography variant="caption" color="text.secondary">
        {tracked.length}/5 selected
      </Typography>
    </Box>
  );
}

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

  const handleTargetBlur = (id: string, value: string) => {
    const num = parseFloat(value);
    const target = isNaN(num) ? null : num;
    saveDefs(defs.map(d => d.id === id ? { ...d, target } : d));
  };

  const handleDelete = (id: string) => {
    saveDefs(defs.filter(d => d.id !== id));
  };

  const handleAdd = () => {
    if (defs.length >= 4) return;
    const newDef: CustomMetricDef = {
      id: crypto.randomUUID(),
      name: `Metric ${defs.length + 1}`,
    };
    saveDefs([...defs, newDef]);
  };

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Track up to 4 personal measurements alongside your daily metrics
      </Typography>
      {defs.map(def => (
        <Box key={def.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TextField
            defaultValue={def.name}
            size="small"
            sx={{ flex: 1 }}
            onBlur={e => handleNameBlur(def.id, e.target.value)}
          />
          <TextField
            type="number"
            size="small"
            placeholder="Target"
            defaultValue={def.target ?? ''}
            sx={{ width: 90 }}
            onBlur={e => handleTargetBlur(def.id, e.target.value)}
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
        disabled={defs.length >= 4}
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
  {key: 'showE1rmProgress',   label: 'E1RM Progress'},
];

const WORKOUT_LABELS: {key: BooleanSettingKey; label: string}[] = [
  {key: 'showStopwatch',          label: 'Stopwatch'},
  {key: 'showWarmupSuggestions',  label: 'Warmup Suggestions'},
  {key: 'showPlateCalculator',    label: 'Plate Calculator'},
];

const FEATURE_LABELS: {key: BooleanSettingKey; label: string}[] = [
  {key: 'showSupplements', label: 'Supplements'},
];

export default function SettingsClient({
  initialName,
  initialImage,
  isCoachDomain,
}: {
  initialName: string;
  initialImage: string | null;
  isCoachDomain: boolean;
}) {
  const { settings, loading, error, clearError, updateSetting } = useSettings();

  // Profile state
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);

  const nameDirty = name.trim() !== savedName && name.trim() !== '';

  const handleSaveName = async () => {
    setNameLoading(true);
    setNameError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setNameError((data as { error?: string }).error ?? 'Failed to save name');
      } else {
        setSavedName(name.trim());
      }
    } catch {
      setNameError('Failed to save name');
    } finally {
      setNameLoading(false);
    }
  };

  const initials = savedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');

  const handleToggle = (key: BooleanSettingKey) => {
    updateSetting(key, !settings[key]);
  };

  if (isCoachDomain) {
    return (
      <Box sx={{pt: 2, pb: 4, maxWidth: 480}}>
        <CoachingSettings mode="coachPortal" />
      </Box>
    );
  }

  return (
    <Box sx={{pt: 2, pb: 4, maxWidth: 480}}>
      {error && (
        <Alert severity="error" sx={{mb: 2}} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Profile */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
        <Avatar
          src={initialImage ?? undefined}
          sx={{ width: 72, height: 72, mb: 1.5, fontSize: '1.5rem' }}
        >
          {!initialImage && initials}
        </Avatar>
        <Tooltip title="Coming soon" placement="bottom">
          <span>
            <Button variant="outlined" size="small" disabled sx={{ mb: 2 }}>
              Change photo
            </Button>
          </span>
        </Tooltip>
        <TextField
          label="Name"
          value={name}
          onChange={e => { setName(e.target.value); setNameError(null); }}
          fullWidth
          inputProps={{ maxLength: 100 }}
          size="small"
        />
        {nameError && (
          <Alert severity="error" sx={{ mt: 1, width: '100%' }} onClose={() => setNameError(null)}>
            {nameError}
          </Alert>
        )}
        {nameDirty && (
          <Button
            variant="contained"
            size="small"
            onClick={handleSaveName}
            disabled={nameLoading}
            startIcon={nameLoading ? <CircularProgress size={14} color="inherit" /> : null}
            sx={{ mt: 1, alignSelf: 'flex-end' }}
          >
            {nameLoading ? 'Saving…' : 'Save'}
          </Button>
        )}
      </Box>

      <Divider sx={{ mb: 3 }} />

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
        <Divider sx={{my: 1}}/>
        <Typography variant="body2" color="text.secondary" sx={{mt: 1.5, mb: 0.5}}>
          Effort metric per set
        </Typography>
        {loading ? (
          <Skeleton variant="rounded" height={40} sx={{mb: 1}}/>
        ) : (
          <ToggleButtonGroup
            value={settings.effortMetric}
            exclusive
            onChange={(_e, val) => { if (val !== null) updateSetting('effortMetric', val as 'none' | 'rpe' | 'rir'); }}
            size="small"
            sx={{mb: 1}}
          >
            <ToggleButton value="none">None</ToggleButton>
            <ToggleButton value="rpe">RPE</ToggleButton>
            <ToggleButton value="rir">RIR</ToggleButton>
          </ToggleButtonGroup>
        )}
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

      <Typography variant="overline" color="text.secondary">E1RM Progress Tracking</Typography>
      <Box sx={{mb: 2}}>
        <E1rmTrackingSection />
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
          sx={{ width: '100%', gap: 0.5, mb: 2 }}
        >
          {CHECK_IN_DAY_NAMES.map((name, i) => (
            <ToggleButton key={i} value={i} sx={{ flex: 1 }}>
              {name.slice(0, 3)}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      )}

      <Divider sx={{my: 3}}/>

      <Typography variant="overline" color="text.secondary">Units</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Weight unit for exercises and body metrics
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
      ) : (
        <ToggleButtonGroup
          value={settings.weightUnit}
          exclusive
          onChange={(_e, val) => { if (val !== null) updateSetting('weightUnit', val as 'kg' | 'lbs'); }}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="kg">kg</ToggleButton>
          <ToggleButton value="lbs">lbs</ToggleButton>
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

      <Typography variant="overline" color="text.secondary">Export Data</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Download your data as CSV files, compatible with Excel and Google Sheets.
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 1 }}>
        <Button
          component="a"
          variant="outlined"
          size="small"
          href="/api/export/training-data"
          download
        >
          Download Training Plans
        </Button>
        <Button
          component="a"
          variant="outlined"
          size="small"
          href="/api/export/metrics"
          download
        >
          Download Daily Metrics
        </Button>
        <Button
          component="a"
          variant="outlined"
          size="small"
          href="/api/export/check-ins"
          download
        >
          Download Check-in History
        </Button>
      </Box>

      <Divider sx={{my: 3}}/>
      <CoachingSettings mode="normal" />
    </Box>
  );
}
