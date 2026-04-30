import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { Metric } from '@/generated/prisma/browser';
import MetricsSummaryTable from './MetricsSummaryTable';

function makeMetric(partial: Partial<Metric> = {}): Metric {
  return {
    id: partial.id ?? 1,
    userId: partial.userId ?? 'user-1',
    date: partial.date ?? new Date('2026-01-05T00:00:00.000Z'),
    weight: partial.weight ?? null,
    steps: partial.steps ?? null,
    sleepMins: partial.sleepMins ?? null,
    calories: partial.calories ?? null,
    protein: partial.protein ?? null,
    carbs: partial.carbs ?? null,
    fat: partial.fat ?? null,
    customMetrics: partial.customMetrics ?? null,
  };
}

describe('MetricsSummaryTable', () => {
  it('does not render hidden macro rows', () => {
    render(
      <MetricsSummaryTable
        currentWeek={[makeMetric({ calories: 2200, protein: 160, carbs: 200, fat: 70 })]}
        weekPrior={[makeMetric({ calories: 2300, protein: 170, carbs: 210, fat: 75 })]}
        weekTargets={null}
        customMetricDefs={[]}
        bodyweightUnit="kg"
        metricConfig={{ visibleBuiltInMetrics: ['calories'], includeCustomMetrics: true }}
      />,
    );

    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(screen.queryByText('Protein (g)')).not.toBeInTheDocument();
    expect(screen.queryByText('Carbs (g)')).not.toBeInTheDocument();
    expect(screen.queryByText('Fat (g)')).not.toBeInTheDocument();
  });
});
