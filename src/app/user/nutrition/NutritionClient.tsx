'use client';

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Stack,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { MetricPrisma, EventPrisma } from '@/types/dataTypes';
import { EventType } from '@/generated/prisma/browser';
import { getDefinedBlockColor } from '@/app/user/calendar/utils';
import { updateMetricClient } from '@lib/metrics';
import { convertDateToDateString } from '@lib/dateUtils';
import { trackFirstWeekEvent } from '@lib/firstWeekEvents';
import { type TargetTemplateWithDays } from '@lib/targetTemplates';
import SleepHmInput from '@/components/SleepHmInput';
import {
  computeMacroGramsFromPercents,
  deriveMacroPercentsFromTargets,
  isMacroPercentSplitValid,
  sumMacroPercents,
} from '@lib/macroTargets';

interface Props {
  userId: string;
  initialMetrics: MetricPrisma[];
  initialEvents: EventPrisma[];
  canEditActuals?: boolean;
  canEditTargets?: boolean;
  initialTemplate?: TargetTemplateWithDays | null;
  /** Pre-loaded template history for coach view — enables client-side backwards lookup */
  initialTemplates?: TargetTemplateWithDays[];
}

type EditValues = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  sleepMins: string;
  weight: string;
};

/** Per-day macro values for the template dialog grid */
type TemplateDayMacroValues = {
  calories: string;
  proteinPct: string;
  carbsPct: string;
  fatPct: string;
};

function getActiveBlock(events: EventPrisma[], today: Date) {
  return (
    events.find(ev => {
      if (ev.eventType !== EventType.BlockEvent) return false;
      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return start <= today && end >= today;
    }) ?? null
  );
}

function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function avgOf(values: (number | null | undefined)[]): number | null {
  const nums = values.filter((v): v is number => v !== null && v !== undefined);
  if (nums.length === 0) return null;
  return Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);
}

function toIntOrNull(s: string): number | null {
  const n = parseInt(s, 10);
  return isNaN(n) ? null : n;
}

function toFloatOrNull(s: string): number | null {
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function getNumericFieldError(value: string, max?: number): string | null {
  if (value.trim() === '') return null;
  const n = Number(value);
  if (Number.isNaN(n)) return 'Enter a valid number';
  if (n < 0) return 'Must be 0 or greater';
  if (max !== undefined && n > max) return `Must be ${max} or less`;
  return null;
}

function hasAnyMacroActuals(metric: Pick<MetricPrisma, 'calories' | 'protein' | 'carbs' | 'fat'>): boolean {
  return metric.calories !== null || metric.protein !== null || metric.carbs !== null || metric.fat !== null;
}

function metricToEditValues(m: MetricPrisma | undefined): EditValues {
  const str = (v: number | null | undefined) => (v !== null && v !== undefined ? String(v) : '');
  return {
    calories: str(m?.calories),
    protein: str(m?.protein),
    carbs: str(m?.carbs),
    fat: str(m?.fat),
    steps: str(m?.steps),
    sleepMins: str(m?.sleepMins),
    weight: str(m?.weight),
  };
}

/**
 * Client-side backwards lookup: find the most recent template whose effectiveFrom
 * is on or before weekStart. Used in coach view where all templates are pre-loaded.
 */
function findActiveTemplate(
  templates: TargetTemplateWithDays[],
  weekStart: Date,
): TargetTemplateWithDays | null {
  const weekTime = weekStart.getTime();
  return (
    [...templates]
      .filter(t => new Date(t.effectiveFrom).getTime() <= weekTime)
      .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime())[0] ?? null
  );
}

const MACROS: { key: 'calories' | 'protein' | 'carbs' | 'fat'; label: string; unit: string; colorToken: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', colorToken: 'error.main' },
  { key: 'protein', label: 'Protein', unit: 'g', colorToken: 'info.main' },
  { key: 'carbs', label: 'Carbs', unit: 'g', colorToken: 'success.main' },
  { key: 'fat', label: 'Fat', unit: 'g', colorToken: 'warning.main' },
];

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat';
const TARGET_MACRO_KEY: Record<MacroKey, 'caloriesTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget'> = {
  calories: 'caloriesTarget',
  protein: 'proteinTarget',
  carbs: 'carbsTarget',
  fat: 'fatTarget',
};

const TOUCH_TARGET_SX = { width: 44, height: 44 };
const DOW_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PCT_KEYS = ['proteinPct', 'carbsPct', 'fatPct'] as const;

/** ISO weekday from a JS Date: 1=Mon … 7=Sun */
function isoWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 7 : d;
}

function getDayMacroComputation(value: TemplateDayMacroValues) {
  const calories = toIntOrNull(value.calories);
  const percents = {
    proteinPct: toIntOrNull(value.proteinPct) ?? 0,
    carbsPct: toIntOrNull(value.carbsPct) ?? 0,
    fatPct: toIntOrNull(value.fatPct) ?? 0,
  };
  return {
    calories,
    percents,
    grams: computeMacroGramsFromPercents(calories, percents),
    splitValid: isMacroPercentSplitValid(calories, percents),
    splitTotal: sumMacroPercents(percents),
  };
}

export default function NutritionClient({
  userId,
  initialMetrics,
  initialEvents,
  canEditActuals = true,
  canEditTargets = true,
  initialTemplate,
  initialTemplates,
}: Props) {
  useAppBar({ title: 'Nutrition' });
  const today = useMemo(() => new Date(), []);

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(today, { weekStartsOn: 1 })
  );
  const [dayMetrics, setDayMetrics] = useState<MetricPrisma[]>(initialMetrics);
  const [events] = useState<EventPrisma[]>(initialEvents);

  // activeTemplate: the carry-forward template whose effectiveFrom <= weekStart.
  // Lazy initializer: SSR mode uses initialTemplate; coach mode derives from initialTemplates
  // so targets are visible on first render without waiting for an effect or navigation.
  const [activeTemplate, setActiveTemplate] = useState<TargetTemplateWithDays | null>(() => {
    if (initialTemplate !== undefined) return initialTemplate ?? null;
    if (initialTemplates) {
      const initMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
      return findActiveTemplate(initialTemplates, initMonday);
    }
    return null;
  });
  const [templateLoading, setTemplateLoading] = useState(false);

  // Skip the initial API fetch when SSR or coach mode already provided the template
  const skipInitialFetchRef = useRef(initialTemplate !== undefined || !!initialTemplates);

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    calories: '', protein: '', carbs: '', fat: '', steps: '', sleepMins: '', weight: '',
  });
  const [savingDay, setSavingDay] = useState(false);
  const [daySaveNotice, setDaySaveNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false);
  // Template dialog state
  const [tmplSteps, setTmplSteps] = useState('');
  const [tmplSleep, setTmplSleep] = useState('');
  const [tmplDays, setTmplDays] = useState<Record<number, TemplateDayMacroValues>>({});
  const [savingTargets, setSavingTargets] = useState(false);

  const activeBlock = useMemo(() => getActiveBlock(events, today), [events, today]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const todayStr = useMemo(() => convertDateToDateString(today), [today]);
  const currentMonday = useMemo(() => startOfWeek(today, { weekStartsOn: 1 }), [today]);
  const isPastWeek = weekStart < currentMonday;

  // Fetch active template for the displayed week
  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    // Coach mode: derive template from pre-loaded history without an API call
    if (initialTemplates) {
      setActiveTemplate(findActiveTemplate(initialTemplates, weekStart));
      return;
    }

    setTemplateLoading(true);
    const weekMonday = convertDateToDateString(weekStart);
    fetch(`/api/target-templates?weekStart=${weekMonday}`)
      .then(r => r.json())
      .then(({ template }: { template: TargetTemplateWithDays | null }) =>
        setActiveTemplate(template ?? null),
      )
      .catch(() => setActiveTemplate(null))
      .finally(() => setTemplateLoading(false));
  }, [weekStart, initialTemplates]);

  const metricsByDate = useMemo(() => {
    const map = new Map<string, MetricPrisma>();
    for (const dm of dayMetrics) {
      map.set(convertDateToDateString(new Date(dm.date)), dm);
    }
    return map;
  }, [dayMetrics]);

  // Weekly average actuals (from DayMetric rows)
  const weeklyAvgActuals = useMemo(() => {
    const weekMetrics = weekDays
      .map(d => metricsByDate.get(convertDateToDateString(d)))
      .filter(Boolean) as MetricPrisma[];
    return MACROS.reduce(
      (acc, { key }) => {
        acc[key] = avgOf(weekMetrics.map(m => m[key]));
        return acc;
      },
      {} as Record<string, number | null>,
    );
  }, [weekDays, metricsByDate]);

  // Weekly average targets (from active template, per day-of-week)
  const weeklyAvgTargets = useMemo(() => {
    return MACROS.reduce(
      (acc, { key }) => {
        const targets = weekDays.map(day => {
          const dow = isoWeekday(day);
          const dayRow = activeTemplate?.days.find(d => d.dayOfWeek === dow);
          return dayRow?.[TARGET_MACRO_KEY[key]] ?? null;
        });
        acc[key] = avgOf(targets);
        return acc;
      },
      {} as Record<string, number | null>,
    );
  }, [weekDays, activeTemplate]);

  const openEditor = useCallback(
    (dateStr: string) => {
      setEditingDate(dateStr);
      setEditValues(metricToEditValues(metricsByDate.get(dateStr)));
    },
    [metricsByDate],
  );

  const closeEditor = useCallback(() => {
    setEditingDate(null);
  }, []);

  const saveDay = useCallback(
    async (dateStr: string) => {
      setSavingDay(true);
      try {
        const existing = metricsByDate.get(dateStr);
        const merged: MetricPrisma = {
          id: existing?.id ?? 0,
          userId,
          date: new Date(dateStr),
          weight: editValues.weight !== '' ? toFloatOrNull(editValues.weight) : (existing?.weight ?? null),
          steps: editValues.steps !== '' ? toIntOrNull(editValues.steps) : (existing?.steps ?? null),
          sleepMins: editValues.sleepMins !== '' ? toIntOrNull(editValues.sleepMins) : (existing?.sleepMins ?? null),
          calories: editValues.calories !== '' ? toIntOrNull(editValues.calories) : (existing?.calories ?? null),
          protein: editValues.protein !== '' ? toIntOrNull(editValues.protein) : (existing?.protein ?? null),
          carbs: editValues.carbs !== '' ? toIntOrNull(editValues.carbs) : (existing?.carbs ?? null),
          fat: editValues.fat !== '' ? toIntOrNull(editValues.fat) : (existing?.fat ?? null),
          customMetrics: existing?.customMetrics ?? null,
        };
        const updated = await updateMetricClient(merged);
        setDayMetrics(prev => {
          const idx = prev.findIndex(m => convertDateToDateString(new Date(m.date)) === dateStr);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
        if (hasAnyMacroActuals(updated)) {
          trackFirstWeekEvent('first_metric_logged', { source: 'nutrition_day_save' });
        }
        setEditingDate(null);
        setDaySaveNotice({ type: 'success', message: `Saved ${format(new Date(dateStr), 'EEE d MMM')}` });
      } catch {
        setDaySaveNotice({ type: 'error', message: 'Failed to save nutrition entry. Please try again.' });
      } finally {
        setSavingDay(false);
      }
    },
    [userId, metricsByDate, editValues],
  );

  const openTargetsDialog = useCallback(() => {
    setTmplSteps(activeTemplate?.stepsTarget != null ? String(activeTemplate.stepsTarget) : '');
    setTmplSleep(activeTemplate?.sleepMinsTarget != null ? String(activeTemplate.sleepMinsTarget) : '');
    const grid: Record<number, TemplateDayMacroValues> = {};
    for (let dow = 1; dow <= 7; dow++) {
      const day = activeTemplate?.days.find(d => d.dayOfWeek === dow);
      const calories = day?.caloriesTarget ?? null;
      const percents = deriveMacroPercentsFromTargets(calories, {
        protein: day?.proteinTarget ?? 0,
        carbs: day?.carbsTarget ?? 0,
        fat: day?.fatTarget ?? 0,
      });
      grid[dow] = {
        calories: calories != null ? String(calories) : '',
        proteinPct: String(percents.proteinPct),
        carbsPct: String(percents.carbsPct),
        fatPct: String(percents.fatPct),
      };
    }
    setTmplDays(grid);
    setTargetsDialogOpen(true);
  }, [activeTemplate]);

  const saveWeekTargets = useCallback(async () => {
    setSavingTargets(true);
    try {
      const weekMonday = convertDateToDateString(weekStart);
      const days: Record<number, { caloriesTarget: number | null; proteinTarget: number | null; carbsTarget: number | null; fatTarget: number | null }> = {};
      for (let dow = 1; dow <= 7; dow++) {
        const v = tmplDays[dow] ?? { calories: '', proteinPct: '0', carbsPct: '0', fatPct: '0' };
        const { calories, grams, splitValid } = getDayMacroComputation(v);
        if (!splitValid) {
          throw new Error(`Invalid macro split for ${DOW_LABELS[dow - 1]}.`);
        }
        days[dow] = {
          caloriesTarget: calories,
          proteinTarget: grams.protein,
          carbsTarget: grams.carbs,
          fatTarget: grams.fat,
        };
      }
      const res = await fetch('/api/target-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          effectiveFrom: weekMonday,
          stepsTarget: toIntOrNull(tmplSteps),
          sleepMinsTarget: toIntOrNull(tmplSleep),
          days,
          targetUserId: userId,
        }),
      });
      if (!res.ok) throw new Error('Failed to save targets');
      const updated: TargetTemplateWithDays = await res.json();
      setActiveTemplate(updated);
      trackFirstWeekEvent('first_nutrition_target_set', { source: 'nutrition_week_targets' });
      setTargetsDialogOpen(false);
      setDaySaveNotice({ type: 'success', message: 'Week targets saved.' });
    } catch (error) {
      const message = error instanceof Error && error.message.startsWith('Invalid macro split')
        ? error.message
        : 'Failed to save week targets. Please try again.';
      setDaySaveNotice({ type: 'error', message });
    } finally {
      setSavingTargets(false);
    }
  }, [weekStart, tmplSteps, tmplSleep, tmplDays, userId]);

  const hasInvalidMacroSplit = useMemo(() => {
    for (let dow = 1; dow <= 7; dow++) {
      const value = tmplDays[dow] ?? { calories: '', proteinPct: '0', carbsPct: '0', fatPct: '0' };
      if (!getDayMacroComputation(value).splitValid) return true;
    }
    return false;
  }, [tmplDays]);

  const weekLabel = `${format(weekStart, 'MMM yyyy')} · Week ${getISOWeek(weekStart)}`;

  return (
    <>
      <Box sx={{ px: 2, py: 2, pb: 6 }}>

        <>
          {/* Active phase */}
          {activeBlock && (
            <Box sx={{ mb: 2 }}>
              <Chip
                label={`Phase: ${activeBlock.name}${activeBlock.blockSubtype ? ` (${activeBlock.blockSubtype})` : ''}`}
                size="small"
                sx={{
                  backgroundColor: activeBlock.blockSubtype
                    ? getDefinedBlockColor(activeBlock.blockSubtype)
                    : (activeBlock.customColor ?? 'grey.500'),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            </Box>
          )}

          {/* Weekly summary */}
          <Card variant="outlined" sx={{ mb: 2 }}>
            <CardContent sx={{ pb: '12px !important' }}>
              <Typography variant="overline" color="text.secondary">
                This week — average
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 1 }}>
                {MACROS.map(({ key, label, unit, colorToken }) => {
                  const actual = weeklyAvgActuals[key];
                  const target = weeklyAvgTargets[key];
                  const pct = actual !== null && target ? Math.min(100, Math.round((actual / target) * 100)) : null;
                  return (
                    <Box key={key}>
                      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                        <Typography variant="body2" fontWeight={500}>{label}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {actual !== null ? `${actual} ${unit}` : '—'}
                          {target !== null ? ` / ${target} ${unit}` : ''}
                        </Typography>
                      </Stack>
                      {pct !== null && (
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            mt: 0.5,
                            height: 6,
                            borderRadius: 3,
                            backgroundColor: 'action.hover',
                            '& .MuiLinearProgress-bar': { backgroundColor: colorToken },
                          }}
                        />
                      )}
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>

          {/* Week navigator */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <IconButton
              size="small"
              onClick={() => setWeekStart(d => addDays(d, -7))}
              aria-label="Previous week"
              sx={TOUCH_TARGET_SX}
            >
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="body2" fontWeight={500}>{weekLabel}</Typography>
            <IconButton
              size="small"
              onClick={() => setWeekStart(d => addDays(d, 7))}
              aria-label="Next week"
              sx={TOUCH_TARGET_SX}
            >
              <ChevronRightIcon />
            </IconButton>
          </Stack>

          {!canEditActuals && canEditTargets && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Coach view: daily logs are read-only, but weekly targets can be updated.
            </Typography>
          )}

          {canEditTargets && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={openTargetsDialog}
                disabled={templateLoading}
              >
                {isPastWeek ? 'View week targets' : 'Set week targets'}
              </Button>
            </Box>
          )}

          {/* Daily log */}
          <Typography variant="overline" color="text.secondary">Daily log</Typography>
          <Stack spacing={1} sx={{ mt: 0.5 }}>
            {weekDays.map(day => {
              const dateStr = convertDateToDateString(day);
              const metric = metricsByDate.get(dateStr);
              const isEditing = editingDate === dateStr;
              const isToday = dateStr === todayStr;
              const dow = isoWeekday(day);
              const dayTemplateMacros = activeTemplate?.days.find(d => d.dayOfWeek === dow) ?? null;

              const hasActuals = metric && (
                metric.calories !== null || metric.protein !== null ||
                metric.carbs !== null || metric.fat !== null
              );
              const hasTargets = dayTemplateMacros !== null && (
                dayTemplateMacros.caloriesTarget !== null ||
                dayTemplateMacros.proteinTarget !== null ||
                dayTemplateMacros.carbsTarget !== null ||
                dayTemplateMacros.fatTarget !== null
              );

              return (
                <Card
                  key={dateStr}
                  variant="outlined"
                  sx={isToday ? { borderColor: 'primary.main', backgroundColor: 'action.selected' } : undefined}
                >
                  <CardContent sx={{ pb: isEditing ? undefined : '12px !important', pt: 1.5, px: 2 }}>
                    {/* Header row */}
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Typography variant="subtitle2" fontWeight={600}>
                        {format(day, 'EEE d MMM')}
                      </Typography>
                      {canEditActuals && !isEditing && (
                        <IconButton size="small" onClick={() => openEditor(dateStr)} aria-label="Edit" sx={TOUCH_TARGET_SX}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      )}
                      {isEditing && (
                        <Stack direction="row" spacing={0.5}>
                          <IconButton size="small" onClick={closeEditor} aria-label="Cancel" sx={TOUCH_TARGET_SX}>
                            <CloseIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => saveDay(dateStr)}
                            disabled={savingDay}
                            aria-label="Save"
                            sx={TOUCH_TARGET_SX}
                          >
                            {savingDay ? <CircularProgress size={16} /> : <CheckIcon fontSize="small" />}
                          </IconButton>
                        </Stack>
                      )}
                    </Stack>

                    {/* Summary view */}
                    {!isEditing && (
                      <>
                        {hasActuals ? (
                          <Stack direction="row" spacing={1} sx={{ mt: 0.5, flexWrap: 'wrap', gap: 0.5 }}>
                            {MACROS.map(({ key, unit }) =>
                              metric[key] !== null ? (
                                <Typography key={key} variant="body2" color="text.secondary">
                                  {metric[key]}{unit !== 'kcal' ? unit : ' kcal'}
                                  {dayTemplateMacros?.[TARGET_MACRO_KEY[key]] != null
                                    ? ` / ${dayTemplateMacros[TARGET_MACRO_KEY[key]]}${unit !== 'kcal' ? unit : ''}`
                                    : ''}
                                </Typography>
                              ) : null
                            )}
                          </Stack>
                        ) : (
                          <Typography variant="body2" color="text.disabled" sx={{ mt: 0.5 }}>
                            No data
                          </Typography>
                        )}
                        {hasTargets && !hasActuals && (
                          <Stack direction="row" spacing={1} sx={{ mt: 0.25, flexWrap: 'wrap', gap: 0.5 }}>
                            {MACROS.map(({ key, unit }) => {
                              const tVal = dayTemplateMacros?.[TARGET_MACRO_KEY[key]];
                              return tVal != null ? (
                                <Typography key={key} variant="caption" color="text.disabled">
                                  target: {tVal}{unit !== 'kcal' ? unit : ' kcal'}
                                </Typography>
                              ) : null;
                            })}
                          </Stack>
                        )}
                      </>
                    )}

                    {/* Inline editor — actuals only, no target editing */}
                    {isEditing && (
                      <Box sx={{ mt: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          NUTRITION
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                          {MACROS.map(({ key, label, unit }) => (
                            (() => {
                              const errorText = getNumericFieldError(editValues[key], key === 'calories' ? 10000 : 1000);
                              return (
                                <TextField
                                  key={key}
                                  label={`${label} (${unit})`}
                                  size="small"
                                  type="number"
                                  value={editValues[key]}
                                  onChange={e => setEditValues(v => ({ ...v, [key]: e.target.value }))}
                                  sx={{ width: 130 }}
                                  inputProps={{ min: 0 }}
                                  error={!!errorText}
                                  helperText={errorText}
                                />
                              );
                            })()
                          ))}
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          OTHER METRICS
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                          <TextField
                            label="Weight (kg)"
                            size="small"
                            type="number"
                            value={editValues.weight}
                            onChange={e => setEditValues(v => ({ ...v, weight: e.target.value }))}
                            sx={{ width: 130 }}
                            inputProps={{ min: 0, step: 0.1 }}
                            error={!!getNumericFieldError(editValues.weight, 500)}
                            helperText={getNumericFieldError(editValues.weight, 500)}
                          />
                          <TextField
                            label="Steps"
                            size="small"
                            type="number"
                            value={editValues.steps}
                            onChange={e => setEditValues(v => ({ ...v, steps: e.target.value }))}
                            sx={{ width: 130 }}
                            inputProps={{ min: 0 }}
                            error={!!getNumericFieldError(editValues.steps, 100000)}
                            helperText={getNumericFieldError(editValues.steps, 100000)}
                          />
                          <TextField
                            label="Sleep (mins)"
                            size="small"
                            type="number"
                            value={editValues.sleepMins}
                            onChange={e => setEditValues(v => ({ ...v, sleepMins: e.target.value }))}
                            sx={{ width: 130 }}
                            inputProps={{ min: 0 }}
                            error={!!getNumericFieldError(editValues.sleepMins, 1440)}
                            helperText={getNumericFieldError(editValues.sleepMins, 1440)}
                          />
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </>
      </Box>

      {/* Week targets dialog */}
      <Dialog open={targetsDialogOpen} onClose={() => setTargetsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Week Targets</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {isPastWeek
              ? 'This week has passed — targets are read-only.'
              : `Targets apply from ${format(weekStart, 'EEE d MMM')} until changed.`}
          </Typography>

          {/* Uniform daily targets */}
          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
            <TextField
              label="Steps target"
              size="small"
              type="number"
              value={tmplSteps}
              onChange={e => setTmplSteps(e.target.value)}
              disabled={isPastWeek}
              inputProps={{ min: 0 }}
              sx={{ flex: 1 }}
              error={!!getNumericFieldError(tmplSteps, 100000)}
              helperText={getNumericFieldError(tmplSteps, 100000)}
            />
            <SleepHmInput
              valueMins={tmplSleep}
              onChange={setTmplSleep}
              disabled={isPastWeek}
              sx={{ flex: 1 }}
            />
          </Stack>

          {/* Per-day macro grid */}
          <Box sx={{ overflowX: 'auto' }}>
            <Box sx={{ minWidth: 860 }}>
              {/* Column headers */}
              <Stack direction="row" alignItems="center" sx={{ mb: 0.5 }}>
                <Box sx={{ width: 40, flexShrink: 0 }} />
                {['Cal', 'Pro %', 'Pro g', 'Carb %', 'Carb g', 'Fat %', 'Fat g', 'Total %'].map((h, index) => (
                  <Typography
                    key={h}
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      flex: 1,
                      textAlign: 'center',
                      ...((index === 1 || index === 7) ? { borderLeft: '1px solid', borderColor: 'divider', ml: 0.5, pl: 0.5 } : {}),
                    }}
                  >
                    {h}
                  </Typography>
                ))}
              </Stack>
              {/* Day rows */}
              {[1, 2, 3, 4, 5, 6, 7].map(dow => (
                (() => {
                  const dayValues = tmplDays[dow] ?? { calories: '', proteinPct: '0', carbsPct: '0', fatPct: '0' };
                  const computed = getDayMacroComputation(dayValues);
                  return (
                    <Stack key={dow} direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
                      <Typography variant="caption" sx={{ width: 40, flexShrink: 0 }}>
                        {DOW_LABELS[dow - 1]}
                      </Typography>

                      <TextField
                        size="small"
                        type="number"
                        value={dayValues.calories}
                        onChange={e =>
                          setTmplDays(prev => ({
                            ...prev,
                            [dow]: {
                              ...(prev[dow] ?? { calories: '', proteinPct: '0', carbsPct: '0', fatPct: '0' }),
                              calories: e.target.value,
                            },
                          }))
                        }
                        disabled={isPastWeek}
                        inputProps={{ min: 0 }}
                        sx={{ flex: 1, '& input': { px: 0.75, textAlign: 'center' } }}
                      />

                      {PCT_KEYS.map((key, index) => {
                        const gramField = key === 'proteinPct'
                          ? computed.grams.protein
                          : key === 'carbsPct'
                            ? computed.grams.carbs
                            : computed.grams.fat;
                        return (
                          <React.Fragment key={key}>
                            <TextField
                              size="small"
                              type="number"
                              value={dayValues[key]}
                              onChange={e =>
                                setTmplDays(prev => ({
                                  ...prev,
                                  [dow]: {
                                    ...(prev[dow] ?? { calories: '', proteinPct: '0', carbsPct: '0', fatPct: '0' }),
                                    [key]: e.target.value,
                                  },
                                }))
                              }
                              disabled={isPastWeek}
                              inputProps={{ min: 0, max: 100 }}
                              error={!computed.splitValid}
                              sx={{
                                flex: 1,
                                ...(index === 0 ? { borderLeft: '1px solid', borderColor: 'divider', ml: 0.5, pl: 0.5 } : {}),
                                '& input': { px: 0.75, textAlign: 'center' },
                              }}
                            />
                            <Box sx={{ flex: 1, minHeight: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Typography variant="body2" color="text.secondary">{gramField} g</Typography>
                            </Box>
                          </React.Fragment>
                        );
                      })}
                      <Box
                        sx={{
                          flex: 1,
                          borderLeft: '1px solid',
                          borderColor: 'divider',
                          ml: 0.5,
                          pl: 0.5,
                          minHeight: 40,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Typography variant="body2" color={computed.splitValid ? 'text.secondary' : 'error.main'} fontWeight={600}>
                          {computed.splitTotal}%
                        </Typography>
                      </Box>
                    </Stack>
                  );
                })()
              ))}
            </Box>
          </Box>
          {hasInvalidMacroSplit && (
            <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
              Each day with calories above 0 must have Protein + Carbs + Fat equal to 100%.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTargetsDialogOpen(false)}>
            {isPastWeek ? 'Close' : 'Cancel'}
          </Button>
          {!isPastWeek && (
            <Button
              variant="contained"
              onClick={saveWeekTargets}
              disabled={savingTargets || hasInvalidMacroSplit}
              startIcon={savingTargets ? <CircularProgress size={16} /> : undefined}
            >
              Save Targets
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={daySaveNotice !== null}
        autoHideDuration={3000}
        onClose={() => setDaySaveNotice(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {daySaveNotice ? (
          <Alert onClose={() => setDaySaveNotice(null)} severity={daySaveNotice.type} variant="filled" sx={{ width: '100%' }}>
            {daySaveNotice.message}
          </Alert>
        ) : <span />}
      </Snackbar>
    </>
  );
}
