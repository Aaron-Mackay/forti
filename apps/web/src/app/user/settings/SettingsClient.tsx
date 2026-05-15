'use client';

import React, {useState} from 'react';
import { signOut } from 'next-auth/react';
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
import DownloadIcon from '@mui/icons-material/Download';
import { Settings, CustomMetricDef, TrackedE1rmExercise } from '@/types/settingsTypes';
import { CHECK_IN_DAY_NAMES } from '@/types/checkInTypes';
import { useSettings } from '@lib/providers/SettingsProvider';
import { useExerciseList } from '@lib/hooks/api/useExerciseList';
import { Exercise } from '@/generated/prisma/browser';
import CoachingSettings from './CoachingSettings';
import { signalFontVariablesClassName } from '@lib/signal/fonts';
import { signalTokens } from '@lib/signal/tokens';
import { TrackedExercisePickerSheet } from './_components/TrackedExercisePickerSheet';

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

  const handleDelete = (id: string) => {
    saveDefs(defs.filter(d => d.id !== id));
  };

  const handleAdd = () => {
    if (defs.length >= 4) return;
    const newDef: CustomMetricDef = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
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

function SignalCustomMetricsSection() {
  const { settings, updateCustomMetrics } = useSettings();
  const [defs, setDefs] = useState<CustomMetricDef[]>(settings.customMetrics);

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
    if (defs.length >= 4) return;
    saveDefs([...defs, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`, name: `Metric ${defs.length + 1}` }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {defs.map(def => (
        <div
          key={def.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '9px 14px',
            background: palette.surface,
            border: `1px solid ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            gap: 8,
          }}
        >
          <input
            defaultValue={def.name}
            onBlur={e => handleNameBlur(def.id, e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 14,
              color: palette.ink,
              fontFamily: signalTokens.fontVar.body,
              outline: 'none',
              minWidth: 0,
            }}
          />
          <button
            type="button"
            aria-label={`Remove ${def.name}`}
            onClick={() => handleDelete(def.id)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: palette.inkMid,
              fontSize: 18,
              lineHeight: 1,
              padding: 0,
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>
      ))}

      {defs.length < 4 && (
        <button
          type="button"
          onClick={handleAdd}
          style={{
            appearance: 'none',
            background: 'transparent',
            border: `1px dashed ${palette.border}`,
            borderRadius: signalTokens.radii.card,
            cursor: 'pointer',
            padding: '9px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 14,
            color: palette.inkMid,
          }}
        >
          Add metric…
          <span aria-hidden="true">+</span>
        </button>
      )}
    </div>
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

const palette = signalTokens.surface.planning;

function SignalSectionCard({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: palette.surface,
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        padding: '18px 16px 16px',
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 6 }}>
        {eyebrow}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 26, fontWeight: 700, lineHeight: 1.03, letterSpacing: '-0.01em', marginBottom: 14 }}>
        {title}
      </div>
      {children}
    </section>
  );
}

function SignalSummaryCell({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div
      style={{
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        padding: '12px 12px 11px',
        background: palette.surfaceAlt,
      }}
    >
      <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 24, fontWeight: 700, lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: palette.inkMid, lineHeight: 1.45 }}>
        {detail}
      </div>
    </div>
  );
}

function SignalToggleList({
  items,
  settings,
  loading,
  onToggle,
}: {
  items: Array<{ key: BooleanSettingKey; label: string }>;
  settings: Settings;
  loading: boolean;
  onToggle: (key: BooleanSettingKey) => void;
}) {
  return (
    <Box sx={{ border: `1px solid ${palette.border}`, borderRadius: `${signalTokens.radii.card}px`, overflow: 'hidden', backgroundColor: 'background.paper' }}>
      {items.map(({ key, label }, index) => (
        <React.Fragment key={key}>
          {index > 0 && <Divider />}
          {loading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.25, px: 1.5 }}>
              <Typography variant="body1">{label}</Typography>
              <Skeleton variant="rounded" width={52} height={32} />
            </Box>
          ) : (
            <FormControlLabel
              control={(
                <Switch
                  checked={settings[key]}
                  onChange={() => onToggle(key)}
                />
              )}
              label={label}
              labelPlacement="start"
              sx={{ width: '100%', mx: 0, px: 1.5, py: 0.5, justifyContent: 'space-between' }}
            />
          )}
        </React.Fragment>
      ))}
    </Box>
  );
}

function SignalE1rmTrackingSection() {
  const { settings, updateTrackedE1rmExercises } = useSettings();
  const [pickerOpen, setPickerOpen] = useState(false);
  const tracked = settings.trackedE1rmExercises;
  const atMax = tracked.length >= 5;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tracked.map((e) => (
          <div
            key={e.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 14px',
              background: palette.surface,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14, color: palette.ink }}>{e.name}</span>
            <button
              type="button"
              aria-label={`Remove ${e.name}`}
              onClick={() => updateTrackedE1rmExercises(tracked.filter((t) => t.id !== e.id))}
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: palette.inkMid,
                fontSize: 18,
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        ))}

        {!atMax ? (
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: `1px dashed ${palette.border}`,
              borderRadius: signalTokens.radii.card,
              cursor: 'pointer',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 14,
              color: palette.inkMid,
            }}
          >
            Add lift…
            <span aria-hidden="true">+</span>
          </button>
        ) : (
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight, padding: '4px 2px' }}>
            5 / 5 tracked
          </div>
        )}
      </div>

      <TrackedExercisePickerSheet
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        tracked={tracked}
        onChange={(next) => updateTrackedE1rmExercises(next)}
      />
    </>
  );
}

export default function SettingsClient({
  initialName,
  initialImage,
  signalEnabled = false,
}: {
  initialName: string;
  initialImage: string | null;
  signalEnabled?: boolean;
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

  if (signalEnabled) {
    const dashboardEnabledCount = CARD_LABELS.filter(({ key }) => settings[key]).length;
    const workoutEnabledCount = WORKOUT_LABELS.filter(({ key }) => settings[key]).length;
    const coachStatus = loading
      ? 'Loading'
      : settings.coachModeActive
        ? 'Coach tools on'
        : 'Personal mode';

    return (
      <div
        className={signalFontVariablesClassName}
        data-signal-settings-shell
        style={{
          minHeight: '100%',
          background: palette.bg,
          color: palette.ink,
          fontFamily: signalTokens.fontVar.body,
          padding: '14px 16px 104px',
        }}
      >
        <style>{`
          @media (min-width: 960px) {
            [data-signal-settings-shell-inner] {
              max-width: 1040px;
              margin: 0 auto;
            }
            [data-signal-settings-summary] {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            [data-signal-settings-grid] {
              grid-template-columns: repeat(2, minmax(0, 1fr));
              align-items: start;
            }
            [data-signal-settings-grid] [data-span-full="true"] {
              grid-column: 1 / -1;
            }
          }
        `}</style>

        <div data-signal-settings-shell-inner>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
              {error}
            </Alert>
          )}

          <section
            style={{
              background: palette.surface,
              border: `1px solid ${palette.borderStrong}`,
              borderRadius: signalTokens.radii.cardLarge,
              padding: '20px 20px 18px',
            }}
          >
            <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: signalTokens.signal.deep, marginBottom: 6 }}>
              Settings
            </div>
            <div style={{ fontFamily: signalTokens.fontVar.cond, fontSize: 32, fontWeight: 700, letterSpacing: '-0.015em', lineHeight: 1, marginBottom: 10 }}>
              Preferences
            </div>
            <div style={{ fontSize: 14, color: palette.inkMid, lineHeight: 1.5, maxWidth: 680 }}>
              Profile, training defaults, weekly check-in timing, units, exports, and the in-progress Signal opt-in all live here.
            </div>

            <div
              data-signal-settings-summary
              style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', marginTop: 18 }}
            >
              <SignalSummaryCell
                label="Profile"
                value={savedName || 'Unnamed'}
                detail={initialImage ? 'Photo saved to your account.' : 'Avatar initials will show until photo upload ships.'}
              />
              <SignalSummaryCell
                label="Training"
                value={`${dashboardEnabledCount}/${CARD_LABELS.length}`}
                detail={`${workoutEnabledCount}/${WORKOUT_LABELS.length} workout tools are active.`}
              />
              <SignalSummaryCell
                label="Mode"
                value={coachStatus}
                detail={loading ? 'Loading coach settings.' : settings.coachModeActive ? 'Coach features are available in the mode pill.' : 'Personal training mode is active.'}
              />
            </div>
          </section>

          <div data-signal-settings-grid style={{ display: 'grid', gap: 14, marginTop: 18 }}>
            <div data-span-full="true">
              <SignalSectionCard eyebrow="Profile" title="Identity">
                <Box sx={{ display: 'grid', gap: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Avatar
                      src={initialImage ?? undefined}
                      sx={{ width: 72, height: 72, fontSize: '1.5rem', border: `1px solid ${palette.border}` }}
                    >
                      {!initialImage && initials}
                    </Avatar>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ color: palette.inkMid, mb: 0.75 }}>
                        This name is used across your training, check-ins, and coach-facing views.
                      </Typography>
                      <Tooltip title="Coming soon" placement="bottom">
                        <span>
                          <Button variant="outlined" size="small" disabled>
                            Change photo
                          </Button>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>

                  <TextField
                    label="Name"
                    value={name}
                    onChange={e => { setName(e.target.value); setNameError(null); }}
                    fullWidth
                    inputProps={{ maxLength: 100 }}
                    size="small"
                  />

                  {nameError && (
                    <Alert severity="error" onClose={() => setNameError(null)}>
                      {nameError}
                    </Alert>
                  )}

                  {nameDirty ? (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveName}
                        disabled={nameLoading}
                        startIcon={nameLoading ? <CircularProgress size={14} color="inherit" /> : null}
                      >
                        {nameLoading ? 'Saving…' : 'Save name'}
                      </Button>
                    </Box>
                  ) : null}
                </Box>
              </SignalSectionCard>
            </div>

            <SignalSectionCard eyebrow="Home" title="Dashboard cards">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Decide which training summaries appear on your home route.
              </Typography>
              <SignalToggleList
                items={CARD_LABELS}
                settings={settings}
                loading={loading}
                onToggle={handleToggle}
              />
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Workout" title="Session defaults">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Tune the controls and effort language used while you log training.
              </Typography>
              <SignalToggleList
                items={WORKOUT_LABELS}
                settings={settings}
                loading={loading}
                onToggle={handleToggle}
              />
              <Typography variant="body2" sx={{ color: palette.inkMid, mt: 2, mb: 0.75 }}>
                Effort metric per set
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={40} sx={{ mb: 1 }} />
              ) : (
                <ToggleButtonGroup
                  value={settings.effortMetric}
                  exclusive
                  onChange={(_e, val) => { if (val !== null) updateSetting('effortMetric', val as 'none' | 'rpe' | 'rir'); }}
                  size="small"
                  sx={{ mb: 0.5, flexWrap: 'wrap' }}
                >
                  <ToggleButton value="none">None</ToggleButton>
                  <ToggleButton value="rpe">RPE</ToggleButton>
                  <ToggleButton value="rir">RIR</ToggleButton>
                </ToggleButtonGroup>
              )}
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Features" title="Optional surfaces">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Keep rarely used areas available only when you want them.
              </Typography>
              <SignalToggleList
                items={FEATURE_LABELS}
                settings={settings}
                loading={loading}
                onToggle={handleToggle}
              />
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Tracking" title="Custom metrics">
              <SignalCustomMetricsSection />
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Strength" title="Tracked lifts">
              <SignalE1rmTrackingSection />
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Check-in" title="Weekly timing">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1 }}>
                Choose the day that starts your weekly check-in rhythm.
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={40} />
              ) : (
                <ToggleButtonGroup
                  value={settings.checkInDay}
                  exclusive
                  onChange={(_e, val) => { if (val !== null) updateSetting('checkInDay', val as number); }}
                  size="small"
                  sx={{ width: '100%', gap: 0.5, flexWrap: 'wrap' }}
                >
                  {CHECK_IN_DAY_NAMES.map((dayName, index) => (
                    <ToggleButton key={index} value={index} sx={{ flex: 1, minWidth: 48 }}>
                      {dayName.slice(0, 3)}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              )}
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Units" title="Display preferences">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1 }}>
                Exercise weight unit
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

              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1 }}>
                Bodyweight unit
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" height={40} sx={{ mb: 0.5 }} />
              ) : (
                <ToggleButtonGroup
                  value={settings.bodyweightUnit}
                  exclusive
                  onChange={(_e, val) => { if (val !== null) updateSetting('bodyweightUnit', val as 'kg' | 'lb' | 'st'); }}
                  size="small"
                  sx={{ flexWrap: 'wrap' }}
                >
                  <ToggleButton value="kg">kg</ToggleButton>
                  <ToggleButton value="lb">lb</ToggleButton>
                  <ToggleButton value="st">st</ToggleButton>
                </ToggleButtonGroup>
              )}
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Onboarding" title="Guide reset">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Re-show the getting-started guide on your home route.
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => updateSetting('onboardingDismissed', false)}
              >
                Show getting started guide
              </Button>
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Signal" title="Experimental UI">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Opt in to the in-progress Signal redesign. Shell, workouts, progress, check-ins, calendar, notifications, and planning tools are already using it.
              </Typography>
              {loading ? (
                <Skeleton variant="rounded" width={140} height={32} sx={{ mb: 1 }} />
              ) : (
                <FormControlLabel
                  control={(
                    <Switch
                      checked={settings.signalUiEnabled}
                      onChange={() => handleToggle('signalUiEnabled')}
                    />
                  )}
                  label="Use Signal UI"
                />
              )}
            </SignalSectionCard>

            <SignalSectionCard eyebrow="Export" title="Download your data">
              <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                Export CSV files that open cleanly in Excel or Google Sheets.
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Button
                  component="a"
                  variant="outlined"
                  size="small"
                  href="/api/export/training-data"
                  download
                  startIcon={<DownloadIcon fontSize="small" />}
                >
                  Download Training Plans
                </Button>
                <Button
                  component="a"
                  variant="outlined"
                  size="small"
                  href="/api/export/metrics"
                  download
                  startIcon={<DownloadIcon fontSize="small" />}
                >
                  Download Daily Metrics
                </Button>
                <Button
                  component="a"
                  variant="outlined"
                  size="small"
                  href="/api/export/check-ins"
                  download
                  startIcon={<DownloadIcon fontSize="small" />}
                >
                  Download Check-in History
                </Button>
              </Box>
            </SignalSectionCard>

            <div data-span-full="true" data-signal-settings-scroll-anchor>
              <SignalSectionCard eyebrow="Coach" title="Connections and coaching">
                <CoachingSettings mode="normal" />
              </SignalSectionCard>
            </div>

            <div data-span-full="true">
              <SignalSectionCard eyebrow="Account" title="Session">
                <Typography variant="body2" sx={{ color: palette.inkMid, mb: 1.5 }}>
                  Sign out of your Forti account on this device.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                >
                  Sign out
                </Button>
              </SignalSectionCard>
            </div>
          </div>
        </div>
      </div>
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
        Exercise weight unit
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

      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Bodyweight unit
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" height={40} sx={{ mb: 2 }} />
      ) : (
        <ToggleButtonGroup
          value={settings.bodyweightUnit}
          exclusive
          onChange={(_e, val) => { if (val !== null) updateSetting('bodyweightUnit', val as 'kg' | 'lb' | 'st'); }}
          size="small"
          sx={{ mb: 2 }}
        >
          <ToggleButton value="kg">kg</ToggleButton>
          <ToggleButton value="lb">lb</ToggleButton>
          <ToggleButton value="st">st</ToggleButton>
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

      <Typography variant="overline" color="text.secondary">Experimental UI</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Opt in to the in-progress Signal redesign. Shell, check-in review, workout logging,
        and plan editor are migrated — other surfaces still use the current design.
      </Typography>
      {loading ? (
        <Skeleton variant="rounded" width={140} height={32} sx={{ mb: 1 }} />
      ) : (
        <FormControlLabel
          control={
            <Switch
              checked={settings.signalUiEnabled}
              onChange={() => handleToggle('signalUiEnabled')}
            />
          }
          label="Use Signal UI"
          sx={{ mb: 1 }}
        />
      )}

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
