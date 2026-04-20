import type { BuiltInMetricKey } from '@/types/metricTypes';

export interface DummySeriesPoint {
  x: number;
  y: number;
}

interface GenerateDummySeriesParams {
  metric: BuiltInMetricKey;
  startDate: string;
  endDate: string;
  seedKey: string;
}

interface MetricProfile {
  min: number;
  max: number;
  baselineMin: number;
  baselineMax: number;
  trendPerDay: number;
  seasonalAmplitude: number;
  noiseAmplitude: number;
  round: 'int' | 'one-decimal';
}

const METRIC_PROFILES: Record<BuiltInMetricKey, MetricProfile> = {
  weight: {
    min: 45, max: 220,
    baselineMin: 62, baselineMax: 98,
    trendPerDay: 0.05,
    seasonalAmplitude: 0.5,
    noiseAmplitude: 0.18,
    round: 'one-decimal',
  },
  steps: {
    min: 500, max: 30000,
    baselineMin: 6500, baselineMax: 11000,
    trendPerDay: 18,
    seasonalAmplitude: 1400,
    noiseAmplitude: 1200,
    round: 'int',
  },
  sleepMins: {
    min: 180, max: 720,
    baselineMin: 390, baselineMax: 500,
    trendPerDay: 1.4,
    seasonalAmplitude: 35,
    noiseAmplitude: 22,
    round: 'int',
  },
  calories: {
    min: 800, max: 6000,
    baselineMin: 1800, baselineMax: 2900,
    trendPerDay: 8,
    seasonalAmplitude: 140,
    noiseAmplitude: 200,
    round: 'int',
  },
  protein: {
    min: 20, max: 350,
    baselineMin: 95, baselineMax: 180,
    trendPerDay: 1.8,
    seasonalAmplitude: 10,
    noiseAmplitude: 12,
    round: 'int',
  },
  carbs: {
    min: 30, max: 600,
    baselineMin: 140, baselineMax: 320,
    trendPerDay: 2.5,
    seasonalAmplitude: 18,
    noiseAmplitude: 26,
    round: 'int',
  },
  fat: {
    min: 10, max: 250,
    baselineMin: 45, baselineMax: 105,
    trendPerDay: 1.1,
    seasonalAmplitude: 8,
    noiseAmplitude: 10,
    round: 'int',
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function roundMetricValue(value: number, roundMode: MetricProfile['round']): number {
  if (roundMode === 'one-decimal') {
    return Number(value.toFixed(1));
  }
  return Math.round(value);
}

export function generateDataVizDummySeries({
  metric,
  startDate,
  endDate,
  seedKey,
}: GenerateDummySeriesParams): DummySeriesPoint[] {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startMs = start.getTime();
  const endMs = end.getTime();

  if (Number.isNaN(startMs) || Number.isNaN(endMs) || startMs >= endMs) {
    return [];
  }

  const profile = METRIC_PROFILES[metric];
  const spanDays = Math.max(1, Math.floor((endMs - startMs) / 86_400_000));
  const points = clamp(Math.floor(spanDays / 5) + 7, 8, 64);
  const spanMs = endMs - startMs;
  const rand = mulberry32(hashString(`${seedKey}|${metric}|${startDate}|${endDate}`));

  const baseline = profile.baselineMin + (profile.baselineMax - profile.baselineMin) * rand();
  const trendDirection = rand() < 0.5 ? -1 : 1;
  const trendPerDay = trendDirection * profile.trendPerDay * (0.35 + rand() * 0.65);
  const phase = rand() * Math.PI * 2;
  const cycleLength = 6 + rand() * 3;

  return Array.from({ length: points }).map((_, idx) => {
    const t = points === 1 ? 0 : idx / (points - 1);
    const x = Math.round(startMs + spanMs * t);
    const elapsedDays = ((x - startMs) / 86_400_000);
    const seasonal = Math.sin((elapsedDays / cycleLength) * Math.PI * 2 + phase) * profile.seasonalAmplitude;
    const noise = (rand() * 2 - 1) * profile.noiseAmplitude;
    const trended = baseline + trendPerDay * elapsedDays + seasonal + noise;
    const y = roundMetricValue(clamp(trended, profile.min, profile.max), profile.round);
    return { x, y };
  });
}
