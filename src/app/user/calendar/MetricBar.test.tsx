import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MetricPrisma } from '@/types/dataTypes';
import { MetricsBar } from './MetricBar';

vi.mock('@/app/user/calendar/utils', () => ({
  minToHhMm: (value: number) => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`,
}));

function makeMetric(partial: Partial<MetricPrisma> = {}): MetricPrisma {
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

describe('MetricsBar', () => {
  it('renders built-in and custom metric values when they are 0', () => {
    render(
      <MetricsBar
        dateMetric={makeMetric({
          calories: 0,
          steps: 0,
          sleepMins: 0,
          customMetrics: {
            customNumber: { value: 0, target: 100 },
          },
        })}
        setSelectedMetric={vi.fn()}
        setInputValue={vi.fn()}
        customMetricDefs={[{ id: 'customNumber', name: 'Custom Number' }]}
      />,
    );

    expect(screen.getAllByText('0')).toHaveLength(3);
    expect(screen.getByText('00:00')).toBeInTheDocument();
    expect(screen.getAllByTestId('AddRoundedIcon')).toHaveLength(1);
  });
});
