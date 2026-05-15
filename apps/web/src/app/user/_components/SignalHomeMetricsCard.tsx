'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, Box, TextField } from '@mui/material';
import { Overlay } from '@/components/signal/overlay';
import type { Metric } from '@/generated/prisma/browser';
import { updateMetricClient } from '@lib/metrics';
import { signalTokens } from '@lib/signal/tokens';
import { bodyweightDisplayToKg, kgToBodyweightDisplay, type BodyweightUnit } from '@/lib/units';

type MetricKey = 'weight' | 'sleepMins' | 'steps' | 'calories';

type Props = {
  userId: string;
  metrics: Metric[];
  today: Date;
  bodyweightUnit: BodyweightUnit;
};

const palette = signalTokens.surface.planning;

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeMetric(metric: Metric | null | undefined): Metric | null {
  if (!metric) return null;
  return {
    ...metric,
    date: metric.date instanceof Date ? metric.date : new Date(metric.date),
  };
}

function buildMetricDraft(userId: string, today: Date, currentMetric: Metric | null): Metric {
  return currentMetric ?? {
    id: 0,
    userId,
    date: today,
    weight: null,
    steps: null,
    sleepMins: null,
    calories: null,
    protein: null,
    carbs: null,
    fat: null,
    customMetrics: null,
  };
}

function formatSleepInput(total: number | null | undefined) {
  if (total == null || total < 0) return '';
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function parseSleepInput(value: string) {
  if (!value) return null;
  const [hours, mins] = value.split(':');
  const parsedHours = Number(hours);
  const parsedMins = Number(mins);
  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMins)) return null;
  return parsedHours * 60 + parsedMins;
}

function startOfWeek(date: Date) {
  const copy = new Date(date);
  const day = (copy.getUTCDay() + 6) % 7;
  copy.setUTCDate(copy.getUTCDate() - day);
  copy.setUTCHours(0, 0, 0, 0);
  return copy;
}

function fieldTitle(key: MetricKey, bodyweightUnit: BodyweightUnit) {
  switch (key) {
    case 'weight':
      return `Bodyweight (${bodyweightUnit})`;
    case 'sleepMins':
      return 'Sleep';
    case 'steps':
      return 'Steps';
    case 'calories':
      return 'Calories';
  }
}

export function SignalHomeMetricsCard({ userId, metrics, today, bodyweightUnit }: Props) {
  const todayIso = toIsoDate(today);
  const [currentMetric, setCurrentMetric] = useState<Metric | null>(() =>
    normalizeMetric(metrics.find((metric) => toIsoDate(new Date(metric.date)) === todayIso) ?? null),
  );
  const [editingKey, setEditingKey] = useState<MetricKey | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCurrentMetric(normalizeMetric(metrics.find((metric) => toIsoDate(new Date(metric.date)) === todayIso) ?? null));
  }, [metrics, todayIso]);

  const weeklyWeightDelta = useMemo(() => {
    if (currentMetric?.weight == null) return null;
    const weekStart = startOfWeek(today).getTime();
    const weekMetrics = metrics
      .map(normalizeMetric)
      .filter((metric): metric is Metric => metric != null && metric.weight != null && metric.date.getTime() >= weekStart && toIsoDate(metric.date) <= todayIso)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    const baseline = weekMetrics[0]?.weight ?? null;
    if (baseline == null) return null;
    return currentMetric.weight - baseline;
  }, [currentMetric, metrics, today, todayIso]);
  const weeklyWeightDeltaDisplay = weeklyWeightDelta == null
    ? null
    : kgToBodyweightDisplay(weeklyWeightDelta, bodyweightUnit);
  const weeklyWeightDirection = weeklyWeightDelta == null
    ? null
    : weeklyWeightDelta > 0 ? '↑' : weeklyWeightDelta < 0 ? '↓' : '→';

  const rows = [
    {
      key: 'weight' as const,
      label: 'Bodyweight',
      value: currentMetric?.weight == null ? '—' : `${kgToBodyweightDisplay(currentMetric.weight, bodyweightUnit)?.toFixed(1)} ${bodyweightUnit}`,
      meta: weeklyWeightDeltaDisplay == null || weeklyWeightDirection == null
        ? 'tap to log'
        : `${weeklyWeightDirection} ${Math.abs(weeklyWeightDeltaDisplay).toFixed(1)} this week`,
      empty: currentMetric?.weight == null,
    },
    {
      key: 'sleepMins' as const,
      label: 'Sleep',
      value: currentMetric?.sleepMins == null ? '—' : `${(currentMetric.sleepMins / 60).toFixed(1)} h`,
      meta: currentMetric?.sleepMins == null ? 'tap to log' : 'today',
      empty: currentMetric?.sleepMins == null,
    },
    {
      key: 'steps' as const,
      label: 'Steps',
      value: currentMetric?.steps == null ? '—' : currentMetric.steps.toLocaleString(),
      meta: currentMetric?.steps == null ? 'tap to log' : 'today',
      empty: currentMetric?.steps == null,
    },
    {
      key: 'calories' as const,
      label: 'Cals',
      value: currentMetric?.calories == null ? '—' : `${currentMetric.calories}`,
      meta: currentMetric?.calories == null ? 'tap to log' : 'kcal',
      empty: currentMetric?.calories == null,
    },
  ];

  function openEditor(key: MetricKey) {
    setError(null);
    setEditingKey(key);
    if (key === 'sleepMins') {
      setDraftValue(formatSleepInput(currentMetric?.sleepMins));
      return;
    }

    if (key === 'weight') {
      const displayValue = kgToBodyweightDisplay(currentMetric?.weight ?? null, bodyweightUnit);
      setDraftValue(displayValue == null ? '' : String(Number(displayValue.toFixed(1))));
      return;
    }

    const rawValue = currentMetric?.[key];
    setDraftValue(rawValue == null ? '' : String(rawValue));
  }

  async function handleSave() {
    if (!editingKey) return;
    setSaving(true);
    setError(null);

    try {
      const nextMetric = buildMetricDraft(userId, today, currentMetric);
      const nextValue = editingKey === 'sleepMins'
        ? parseSleepInput(draftValue)
        : draftValue.trim() === ''
          ? null
          : Number(draftValue);

      if (nextValue !== null && !Number.isFinite(nextValue)) {
        throw new Error('Enter a valid number');
      }

      const updatedMetric: Metric = {
        ...nextMetric,
        [editingKey]: editingKey === 'weight' && nextValue != null
          ? bodyweightDisplayToKg(nextValue, bodyweightUnit)
          : nextValue,
      };

      const saved = normalizeMetric(await updateMetricClient(updatedMetric));
      setCurrentMetric(saved);
      setEditingKey(null);
      setDraftValue('');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save metric');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        style={{
          background: palette.surface,
          border: `1px solid ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          overflow: 'hidden',
        }}
      >
        <div style={{ padding: '18px 18px 8px', fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>
          Today&apos;s metrics
        </div>
        {rows.map((row, index) => (
          <button
            key={row.key}
            type="button"
            onClick={() => openEditor(row.key)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              padding: '12px 18px',
              background: 'transparent',
              border: 'none',
              borderTop: index === 0 ? 'none' : `1px solid ${palette.border}`,
              color: palette.ink,
              cursor: 'pointer',
              textAlign: 'left',
              fontFamily: signalTokens.fontVar.body,
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{row.label}</div>
              <div
                style={{
                  marginTop: 2,
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  color: row.empty ? palette.inkLight : palette.inkMid,
                }}
              >
                {row.meta}
              </div>
            </div>
            <div
              style={{
                fontFamily: signalTokens.fontVar.cond,
                fontSize: 16,
                fontWeight: 700,
                color: row.empty ? palette.inkLight : palette.ink,
                whiteSpace: 'nowrap',
              }}
            >
              {row.value}
            </div>
          </button>
        ))}
      </div>

      <Overlay
        open={editingKey != null}
        onClose={() => setEditingKey(null)}
        title={editingKey ? `Edit ${fieldTitle(editingKey, bodyweightUnit)}` : 'Edit metric'}
        size="sm"
        dismissOnBackdrop={!saving}
        dirty={!saving && draftValue.length > 0}
        primaryAction={{
          label: saving ? 'Saving…' : 'Save',
          onClick: handleSave,
          disabled: saving,
        }}
        ghostAction={{ label: 'Cancel', onClick: () => setEditingKey(null) }}
      >
        <Box sx={{ pt: 1, pb: 1 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            type={editingKey === 'sleepMins' ? 'time' : 'number'}
            label={editingKey ? fieldTitle(editingKey, bodyweightUnit) : 'Metric'}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            inputProps={editingKey === 'sleepMins' ? undefined : { inputMode: 'decimal' }}
          />
        </Box>
      </Overlay>
    </>
  );
}
