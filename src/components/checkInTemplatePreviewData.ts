'use client';

import type { Metric } from '@/generated/prisma/browser';
import type { WeekTargets } from '@/types/checkInTypes';
import type { CustomMetricDef } from '@/types/settingsTypes';

export interface CheckInTemplatePreviewData {
  weekStart: string;
  currentWeek: Metric[];
  priorWeek: Metric[];
  weekTargets: WeekTargets;
  customMetricDefs: CustomMetricDef[];
  trainingCounts: { completed: number; planned: number };
  trainingSessions: Array<{ day: string; name: string }>;
}

const TRAINING_NAMES = [
  'Lower Body A',
  'Upper Push',
  'Lower Body B',
  'Upper Pull',
  'Conditioning',
];

const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const DEFAULT_CUSTOM_METRICS: CustomMetricDef[] = [];

export function createCheckInTemplatePreviewData(seedKey = 'default'): CheckInTemplatePreviewData {
  const weekStart = getIsoWeekStartUTC(new Date());
  const priorWeekStart = addDaysUTC(weekStart, -7);
  const weekStartIso = toIsoDate(weekStart);

  const currentWeek = buildWeekMetrics(weekStart, 1, seedKey);
  const priorWeek = buildWeekMetrics(priorWeekStart, 101, `${seedKey}-prior`);

  const trainingPlanned = 5;
  const trainingCompleted = 3 + randomInt(`${seedKey}:training:completed`, 0, 2);
  const trainingSessions = buildTrainingSessions(trainingCompleted, seedKey);

  return {
    weekStart: weekStartIso,
    currentWeek,
    priorWeek,
    weekTargets: {
      stepsTarget: 10000,
      sleepMinsTarget: 480,
      caloriesTarget: 2500,
      proteinTarget: 180,
      carbsTarget: 280,
      fatTarget: 75,
    },
    customMetricDefs: DEFAULT_CUSTOM_METRICS,
    trainingCounts: {
      completed: trainingCompleted,
      planned: trainingPlanned,
    },
    trainingSessions,
  };
}

export const DEFAULT_CHECK_IN_TEMPLATE_PREVIEW_DATA = createCheckInTemplatePreviewData('template-preview');

function buildWeekMetrics(weekStart: Date, baseId: number, seedKey: string): Metric[] {
  return Array.from({ length: 7 }, (_, i) => {
    const date = addDaysUTC(weekStart, i);
    const dateIso = toIsoDate(date);
    const trend = i - 3;
    const weight = clamp(83.9 + trend * -0.05 + randomFloat(`${seedKey}:${dateIso}:weight`, -0.18, 0.18), 82.8, 85.2);
    const steps = clampInt(9800 + trend * 210 + randomInt(`${seedKey}:${dateIso}:steps`, -1200, 1600), 6500, 15000);
    const sleepMins = clampInt(480 + trend * 4 + randomInt(`${seedKey}:${dateIso}:sleep`, -35, 28), 390, 570);
    const calories = clampInt(2480 + trend * 10 + randomInt(`${seedKey}:${dateIso}:calories`, -180, 210), 2050, 3200);
    const protein = clampInt(180 + trend * 1 + randomInt(`${seedKey}:${dateIso}:protein`, -16, 18), 130, 240);
    const carbs = clampInt(275 + trend * 3 + randomInt(`${seedKey}:${dateIso}:carbs`, -28, 32), 180, 380);
    const fat = clampInt(74 + randomInt(`${seedKey}:${dateIso}:fat`, -10, 10), 45, 110);
    return {
      id: baseId + i,
      userId: 'preview-user',
      weight: round(weight, 1),
      steps,
      sleepMins,
      calories,
      protein,
      carbs,
      fat,
      date,
      customMetrics: null,
    };
  });
}

function buildTrainingSessions(count: number, seedKey: string): Array<{ day: string; name: string }> {
  const dayOffsets = [0, 1, 3, 5, 6];
  return Array.from({ length: count }, (_, idx) => {
    const day = DAY_SHORT[dayOffsets[idx]];
    const nameIdx = randomInt(`${seedKey}:training:name:${idx}`, 0, TRAINING_NAMES.length - 1);
    return {
      day,
      name: TRAINING_NAMES[nameIdx],
    };
  });
}

function getIsoWeekStartUTC(date: Date): Date {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay();
  const isoOffset = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + isoOffset);
  return utc;
}

function addDaysUTC(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampInt(value: number, min: number, max: number): number {
  return Math.round(clamp(value, min, max));
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function randomInt(key: string, min: number, max: number): number {
  const r = hashToUnit(key);
  return Math.floor(r * (max - min + 1)) + min;
}

function randomFloat(key: string, min: number, max: number): number {
  const r = hashToUnit(key);
  return min + r * (max - min);
}

function hashToUnit(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return ((hash >>> 0) % 1_000_000) / 1_000_000;
}
