import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { Metric } from '@/generated/prisma/browser';
import MetricsDailyBreakdown from './MetricsDailyBreakdown';
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

function EditableBreakdownHarness({ metric }: { metric: Metric }) {
  const [metrics, setMetrics] = useState([metric]);

  return (
    <MetricsDailyBreakdown
      metrics={metrics}
      weekStartDate="2026-01-05"
      customMetricDefs={[]}
      includeEmptyRows
      editable
      onMetricChange={(dayOffset, key, value) => {
        setMetrics(prev => prev.map((entry, index) => {
          if (index !== 0 || dayOffset !== 0 || key !== 'steps') return entry;
          return { ...entry, steps: value };
        }));
      }}
      metricConfig={{ visibleBuiltInMetrics: ['weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat'], includeCustomMetrics: true }}
    />
  );
}

function EditableMetricsCardHarness({ metric }: { metric: Metric }) {
  const [metrics, setMetrics] = useState([metric]);

  return (
    <>
      <MetricsSummaryTable
        currentWeek={metrics}
        weekPrior={[]}
        weekTargets={null}
        customMetricDefs={[]}
        bodyweightUnit="kg"
        metricConfig={{ visibleBuiltInMetrics: ['steps'], includeCustomMetrics: true }}
      />
      <MetricsDailyBreakdown
        metrics={metrics}
        weekStartDate="2026-01-05"
        customMetricDefs={[]}
        includeEmptyRows
        editable
        onMetricChange={(dayOffset, key, value) => {
          setMetrics(prev => prev.map((entry, index) => {
            if (index !== 0 || dayOffset !== 0 || key !== 'steps') return entry;
            return { ...entry, steps: value };
          }));
        }}
        metricConfig={{ visibleBuiltInMetrics: ['steps'], includeCustomMetrics: true }}
      />
    </>
  );
}

describe('MetricsDailyBreakdown', () => {
  it('shows weekday and calendar date in each header cell', () => {
    render(
      <MetricsDailyBreakdown
        metrics={[makeMetric({ steps: 1000 })]}
        weekStartDate="2026-01-05"
        customMetricDefs={[]}
        includeEmptyRows
        metricConfig={{ visibleBuiltInMetrics: ['weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat'], includeCustomMetrics: true }}
      />,
    );

    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('05/01')).toBeInTheDocument();
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('11/01')).toBeInTheDocument();
  });

  it('keeps 4-digit numeric values visible in editable fields and preserves them after resync', async () => {
    const onMetricChange = vi.fn();
    const metric = makeMetric({ steps: 1000 });
    const { rerender } = render(
      <MetricsDailyBreakdown
        metrics={[metric]}
        weekStartDate="2026-01-05"
        customMetricDefs={[]}
        includeEmptyRows
        editable
        onMetricChange={onMetricChange}
        metricConfig={{ visibleBuiltInMetrics: ['weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat'], includeCustomMetrics: true }}
      />,
    );

    const stepsRow = screen.getByText('Steps').closest('tr');
    expect(stepsRow).not.toBeNull();
    const stepInputs = within(stepsRow as HTMLTableRowElement).getAllByRole('spinbutton') as HTMLInputElement[];

    await waitFor(() => {
      expect(stepInputs[0].value).toBe('1000');
    });

    fireEvent.change(stepInputs[0], { target: { value: '1234' } });
    expect(onMetricChange).toHaveBeenCalledWith(0, 'steps', 1234);

    rerender(
      <MetricsDailyBreakdown
        metrics={[makeMetric({ steps: 1234 })]}
        weekStartDate="2026-01-05"
        customMetricDefs={[]}
        includeEmptyRows
        editable
        onMetricChange={onMetricChange}
        metricConfig={{ visibleBuiltInMetrics: ['weight', 'steps', 'sleepMins', 'calories', 'protein', 'carbs', 'fat'], includeCustomMetrics: true }}
      />,
    );

    await waitFor(() => {
      expect(stepInputs[0].value).toBe('1234');
    });
  });

  it('hides filtered built-in metrics rows', () => {
    render(
      <MetricsDailyBreakdown
        metrics={[makeMetric({ calories: 2200, protein: 160, carbs: 200, fat: 70 })]}
        weekStartDate="2026-01-05"
        customMetricDefs={[]}
        includeEmptyRows
        metricConfig={{ visibleBuiltInMetrics: ['calories'], includeCustomMetrics: true }}
      />,
    );

    expect(screen.getByText('Calories')).toBeInTheDocument();
    expect(screen.queryByText('Protein (g)')).not.toBeInTheDocument();
    expect(screen.queryByText('Carbs (g)')).not.toBeInTheDocument();
    expect(screen.queryByText('Fat (g)')).not.toBeInTheDocument();
  });

  it('keeps focus on an editable numeric cell when parent metric state updates immediately', async () => {
    render(<EditableBreakdownHarness metric={makeMetric({ steps: 1000 })} />);

    const stepsRow = screen.getByText('Steps').closest('tr');
    expect(stepsRow).not.toBeNull();
    const stepInputs = within(stepsRow as HTMLTableRowElement).getAllByRole('spinbutton') as HTMLInputElement[];
    const firstInput = stepInputs[0];

    firstInput.focus();
    expect(document.activeElement).toBe(firstInput);

    fireEvent.change(firstInput, { target: { value: '1234' } });

    await waitFor(() => {
      expect(firstInput.value).toBe('1234');
    });

    expect(document.activeElement).toBe(firstInput);
  });

  it('updates the summary table immediately when an editable metric changes', async () => {
    render(<EditableMetricsCardHarness metric={makeMetric({ steps: 1000 })} />);

    const summaryTable = screen.getByTestId('summary-table');
    const breakdownTable = screen.getByTestId('breakdown-table');
    expect(within(summaryTable).getByText('1,000')).toBeInTheDocument();

    const stepsRow = within(breakdownTable).getByText('Steps').closest('tr');
    expect(stepsRow).not.toBeNull();
    const stepInputs = within(stepsRow as HTMLTableRowElement).getAllByRole('spinbutton') as HTMLInputElement[];

    fireEvent.change(stepInputs[0], { target: { value: '1234' } });

    await waitFor(() => {
      expect(within(summaryTable).getByText('1,234')).toBeInTheDocument();
    });
  });
});
