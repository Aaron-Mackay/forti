import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import E1rmSparkline from './E1rmSparkline';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('E1rmSparkline', () => {
  it('shows empty-state placeholder when there is no history and no live e1rm', () => {
    render(
      <E1rmSparkline
        exerciseId={1}
        history={[]}
        todayE1RM={null}
      />,
    );

    expect(screen.getByText('Log a weighted set to start tracking')).toBeInTheDocument();
  });

  it('renders the chart container when historical data exists', () => {
    render(
      <E1rmSparkline
        exerciseId={1}
        history={[
          {date: '2025-01-10T00:00:00.000Z', bestE1rm: 150},
          {date: '2025-02-10T00:00:00.000Z', bestE1rm: 200},
        ]}
        todayE1RM={null}
      />,
    );

    expect(screen.queryByText('Log a weighted set to start tracking')).not.toBeInTheDocument();
  });
});
