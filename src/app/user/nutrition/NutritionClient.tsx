'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
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
  TextField,
  Typography,
} from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import { addDays, format, getISOWeek, startOfWeek } from 'date-fns';
import { HEIGHT_EXC_APPBAR } from '@/components/CustomAppBar';
import { useAppBar } from '@lib/providers/AppBarProvider';
import { DayMetricPrisma, EventPrisma } from '@/types/dataTypes';
import { EventType } from '@prisma/client';
import { getDefinedBlockColor } from '@/app/user/calendar/utils';
import { updateDayMetricClient } from '@lib/dayMetrics';
import { convertDateToDateString } from '@lib/dateUtils';

interface Props {
  userId: string;
  initialDayMetrics: DayMetricPrisma[];
  initialEvents: EventPrisma[];
  readOnly?: boolean;
}

type EditValues = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  caloriesTarget: string;
  proteinTarget: string;
  carbsTarget: string;
  fatTarget: string;
  steps: string;
  sleepMins: string;
  stepsTarget: string;
  sleepMinsTarget: string;
  weight: string;
};

type WeekTargetValues = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  steps: string;
  sleep: string;
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

function metricToEditValues(m: DayMetricPrisma | undefined): EditValues {
  const str = (v: number | null | undefined) => (v !== null && v !== undefined ? String(v) : '');
  return {
    calories: str(m?.calories),
    protein: str(m?.protein),
    carbs: str(m?.carbs),
    fat: str(m?.fat),
    caloriesTarget: str(m?.caloriesTarget),
    proteinTarget: str(m?.proteinTarget),
    carbsTarget: str(m?.carbsTarget),
    fatTarget: str(m?.fatTarget),
    steps: str(m?.steps),
    sleepMins: str(m?.sleepMins),
    stepsTarget: str(m?.stepsTarget),
    sleepMinsTarget: str(m?.sleepMinsTarget),
    weight: str(m?.weight),
  };
}

const MACROS: { key: 'calories' | 'protein' | 'carbs' | 'fat'; label: string; unit: string; color: string }[] = [
  { key: 'calories', label: 'Calories', unit: 'kcal', color: '#ff7043' },
  { key: 'protein', label: 'Protein', unit: 'g', color: '#42a5f5' },
  { key: 'carbs', label: 'Carbs', unit: 'g', color: '#66bb6a' },
  { key: 'fat', label: 'Fat', unit: 'g', color: '#ffa726' },
];

const TARGET_KEY: Record<string, keyof DayMetricPrisma> = {
  calories: 'caloriesTarget',
  protein: 'proteinTarget',
  carbs: 'carbsTarget',
  fat: 'fatTarget',
};

export default function NutritionClient({
  userId,
  initialDayMetrics,
  initialEvents,
  readOnly: readOnlyProp = false,
}: Props) {
  useAppBar({ title: 'Nutrition' });
  const today = useMemo(() => new Date(), []);

  const [weekStart, setWeekStart] = useState<Date>(() =>
    startOfWeek(today, { weekStartsOn: 1 })
  );
  const [dayMetrics, setDayMetrics] = useState<DayMetricPrisma[]>(initialDayMetrics);
  const [events] = useState<EventPrisma[]>(initialEvents);

  const readOnly = readOnlyProp;

  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<EditValues>({
    calories: '', protein: '', carbs: '', fat: '',
    caloriesTarget: '', proteinTarget: '', carbsTarget: '', fatTarget: '',
    steps: '', sleepMins: '', stepsTarget: '', sleepMinsTarget: '', weight: '',
  });
  const [savingDay, setSavingDay] = useState(false);

  const [targetsDialogOpen, setTargetsDialogOpen] = useState(false);
  const [weekTargetValues, setWeekTargetValues] = useState<WeekTargetValues>({
    calories: '', protein: '', carbs: '', fat: '', steps: '', sleep: '',
  });
  const [savingTargets, setSavingTargets] = useState(false);

  const activeBlock = useMemo(() => getActiveBlock(events, today), [events, today]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const metricsByDate = useMemo(() => {
    const map = new Map<string, DayMetricPrisma>();
    for (const dm of dayMetrics) {
      map.set(convertDateToDateString(new Date(dm.date)), dm);
    }
    return map;
  }, [dayMetrics]);

  const weeklyAvg = useMemo(() => {
    const weekMetrics = weekDays
      .map(d => metricsByDate.get(convertDateToDateString(d)))
      .filter(Boolean) as DayMetricPrisma[];

    return MACROS.reduce(
      (acc, { key }) => {
        acc[key] = avgOf(weekMetrics.map(m => m[key]));
        acc[TARGET_KEY[key] as string] = avgOf(weekMetrics.map(m => m[TARGET_KEY[key] as keyof DayMetricPrisma] as number | null));
        return acc;
      },
      {} as Record<string, number | null>
    );
  }, [weekDays, metricsByDate]);

  const openEditor = useCallback(
    (dateStr: string) => {
      setEditingDate(dateStr);
      setEditValues(metricToEditValues(metricsByDate.get(dateStr)));
    },
    [metricsByDate]
  );

  const closeEditor = useCallback(() => {
    setEditingDate(null);
  }, []);

  const saveDay = useCallback(
    async (dateStr: string) => {
      setSavingDay(true);
      try {
        const existing = metricsByDate.get(dateStr);
        const merged: DayMetricPrisma = {
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
          caloriesTarget: editValues.caloriesTarget !== '' ? toIntOrNull(editValues.caloriesTarget) : (existing?.caloriesTarget ?? null),
          proteinTarget: editValues.proteinTarget !== '' ? toIntOrNull(editValues.proteinTarget) : (existing?.proteinTarget ?? null),
          carbsTarget: editValues.carbsTarget !== '' ? toIntOrNull(editValues.carbsTarget) : (existing?.carbsTarget ?? null),
          fatTarget: editValues.fatTarget !== '' ? toIntOrNull(editValues.fatTarget) : (existing?.fatTarget ?? null),
          stepsTarget: editValues.stepsTarget !== '' ? toIntOrNull(editValues.stepsTarget) : (existing?.stepsTarget ?? null),
          sleepMinsTarget: editValues.sleepMinsTarget !== '' ? toIntOrNull(editValues.sleepMinsTarget) : (existing?.sleepMinsTarget ?? null),
          customMetrics: existing?.customMetrics ?? null,
        };
        const updated = await updateDayMetricClient(merged);
        setDayMetrics(prev => {
          const idx = prev.findIndex(m => convertDateToDateString(new Date(m.date)) === dateStr);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = updated;
            return next;
          }
          return [...prev, updated];
        });
        setEditingDate(null);
      } finally {
        setSavingDay(false);
      }
    },
    [userId, metricsByDate, editValues]
  );

  const saveWeekTargets = useCallback(async () => {
    setSavingTargets(true);
    try {
      await Promise.all(
        weekDays.map(day => {
          const dateStr = convertDateToDateString(day);
          const existing = metricsByDate.get(dateStr);
          const merged: DayMetricPrisma = {
            id: existing?.id ?? 0,
            userId,
            date: day,
            weight: existing?.weight ?? null,
            steps: existing?.steps ?? null,
            sleepMins: existing?.sleepMins ?? null,
            calories: existing?.calories ?? null,
            protein: existing?.protein ?? null,
            carbs: existing?.carbs ?? null,
            fat: existing?.fat ?? null,
            caloriesTarget: weekTargetValues.calories !== '' ? toIntOrNull(weekTargetValues.calories) : (existing?.caloriesTarget ?? null),
            proteinTarget: weekTargetValues.protein !== '' ? toIntOrNull(weekTargetValues.protein) : (existing?.proteinTarget ?? null),
            carbsTarget: weekTargetValues.carbs !== '' ? toIntOrNull(weekTargetValues.carbs) : (existing?.carbsTarget ?? null),
            fatTarget: weekTargetValues.fat !== '' ? toIntOrNull(weekTargetValues.fat) : (existing?.fatTarget ?? null),
            stepsTarget: weekTargetValues.steps !== '' ? toIntOrNull(weekTargetValues.steps) : (existing?.stepsTarget ?? null),
            sleepMinsTarget: weekTargetValues.sleep !== '' ? toIntOrNull(weekTargetValues.sleep) : (existing?.sleepMinsTarget ?? null),
            customMetrics: existing?.customMetrics ?? null,
          };
          return updateDayMetricClient(merged).then(updated => ({ dateStr, updated }));
        })
      ).then(results => {
        setDayMetrics(prev => {
          const map = new Map(prev.map(m => [convertDateToDateString(new Date(m.date)), m]));
          for (const { dateStr, updated } of results) {
            map.set(dateStr, updated);
          }
          return Array.from(map.values());
        });
      });
      setTargetsDialogOpen(false);
    } finally {
      setSavingTargets(false);
    }
  }, [userId, weekDays, metricsByDate, weekTargetValues]);

  const weekLabel = `${format(weekStart, 'MMM')}  Week ${getISOWeek(weekStart)}`;

  return (
    <>
      <Box sx={{ height: HEIGHT_EXC_APPBAR, overflowY: 'auto', px: 2, py: 2 }}>


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
                  {MACROS.map(({ key, label, unit, color }) => {
                    const actual = weeklyAvg[key];
                    const target = weeklyAvg[TARGET_KEY[key]];
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
                              '& .MuiLinearProgress-bar': { backgroundColor: color },
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
              >
                <ChevronLeftIcon />
              </IconButton>
              <Typography variant="body2" fontWeight={500}>{weekLabel}</Typography>
              <IconButton
                size="small"
                onClick={() => setWeekStart(d => addDays(d, 7))}
                aria-label="Next week"
              >
                <ChevronRightIcon />
              </IconButton>
            </Stack>

            {!readOnly && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setTargetsDialogOpen(true)}
                >
                  Set week targets
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
                const hasActuals = metric && (
                  metric.calories !== null || metric.protein !== null ||
                  metric.carbs !== null || metric.fat !== null
                );
                const hasTargets = metric && (
                  metric.caloriesTarget !== null || metric.proteinTarget !== null ||
                  metric.carbsTarget !== null || metric.fatTarget !== null
                );

                return (
                  <Card key={dateStr} variant="outlined">
                    <CardContent sx={{ pb: isEditing ? undefined : '12px !important', pt: 1.5, px: 2 }}>
                      {/* Header row */}
                      <Stack direction="row" alignItems="center" justifyContent="space-between">
                        <Typography variant="subtitle2" fontWeight={600}>
                          {format(day, 'EEE d MMM')}
                        </Typography>
                        {!readOnly && !isEditing && (
                          <IconButton size="small" onClick={() => openEditor(dateStr)} aria-label="Edit">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        )}
                        {isEditing && (
                          <Stack direction="row" spacing={0.5}>
                            <IconButton size="small" onClick={closeEditor} aria-label="Cancel">
                              <CloseIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => saveDay(dateStr)}
                              disabled={savingDay}
                              aria-label="Save"
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
                                    {metric[TARGET_KEY[key] as keyof DayMetricPrisma] !== null
                                      ? ` / ${metric[TARGET_KEY[key] as keyof DayMetricPrisma]}${unit !== 'kcal' ? unit : ''}`
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
                                const tKey = TARGET_KEY[key] as keyof DayMetricPrisma;
                                return metric[tKey] !== null ? (
                                  <Typography key={key} variant="caption" color="text.disabled">
                                    target: {String(metric[tKey])}{unit !== 'kcal' ? unit : ' kcal'}
                                  </Typography>
                                ) : null;
                              })}
                            </Stack>
                          )}
                        </>
                      )}

                      {/* Inline editor */}
                      {isEditing && (
                        <Box sx={{ mt: 1.5 }}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            NUTRITION
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                            {MACROS.map(({ key, label, unit }) => (
                              <TextField
                                key={key}
                                label={`${label} (${unit})`}
                                size="small"
                                type="number"
                                value={editValues[key]}
                                onChange={e => setEditValues(v => ({ ...v, [key]: e.target.value }))}
                                sx={{ width: 130 }}
                                inputProps={{ min: 0 }}
                              />
                            ))}
                          </Stack>

                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            NUTRITION TARGETS
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap', gap: 1 }}>
                            {MACROS.map(({ key, label, unit }) => {
                              const tKey = `${key}Target` as keyof EditValues;
                              return (
                                <TextField
                                  key={tKey}
                                  label={`${label} target (${unit})`}
                                  size="small"
                                  type="number"
                                  value={editValues[tKey]}
                                  onChange={e => setEditValues(v => ({ ...v, [tKey]: e.target.value }))}
                                  sx={{ width: 130 }}
                                  inputProps={{ min: 0 }}
                                />
                              );
                            })}
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
                            />
                            <TextField
                              label="Steps"
                              size="small"
                              type="number"
                              value={editValues.steps}
                              onChange={e => setEditValues(v => ({ ...v, steps: e.target.value }))}
                              sx={{ width: 130 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              label="Steps target"
                              size="small"
                              type="number"
                              value={editValues.stepsTarget}
                              onChange={e => setEditValues(v => ({ ...v, stepsTarget: e.target.value }))}
                              sx={{ width: 130 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              label="Sleep (mins)"
                              size="small"
                              type="number"
                              value={editValues.sleepMins}
                              onChange={e => setEditValues(v => ({ ...v, sleepMins: e.target.value }))}
                              sx={{ width: 130 }}
                              inputProps={{ min: 0 }}
                            />
                            <TextField
                              label="Sleep target (mins)"
                              size="small"
                              type="number"
                              value={editValues.sleepMinsTarget}
                              onChange={e => setEditValues(v => ({ ...v, sleepMinsTarget: e.target.value }))}
                              sx={{ width: 130 }}
                              inputProps={{ min: 0 }}
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

      {/* Set week targets dialog */}
      <Dialog open={targetsDialogOpen} onClose={() => setTargetsDialogOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Set Week Targets</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Fills all 7 days of this week. Existing values are preserved for fields left blank.
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Calories (kcal)"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.calories}
              onChange={e => setWeekTargetValues(v => ({ ...v, calories: e.target.value }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Protein (g)"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.protein}
              onChange={e => setWeekTargetValues(v => ({ ...v, protein: e.target.value }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Carbs (g)"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.carbs}
              onChange={e => setWeekTargetValues(v => ({ ...v, carbs: e.target.value }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Fat (g)"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.fat}
              onChange={e => setWeekTargetValues(v => ({ ...v, fat: e.target.value }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Steps"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.steps}
              onChange={e => setWeekTargetValues(v => ({ ...v, steps: e.target.value }))}
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Sleep (mins)"
              size="small"
              type="number"
              fullWidth
              value={weekTargetValues.sleep}
              onChange={e => setWeekTargetValues(v => ({ ...v, sleep: e.target.value }))}
              inputProps={{ min: 0 }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTargetsDialogOpen(false)} disabled={savingTargets}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={saveWeekTargets}
            disabled={savingTargets}
            startIcon={savingTargets ? <CircularProgress size={16} /> : undefined}
          >
            Set
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
