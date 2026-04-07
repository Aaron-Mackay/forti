import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import E1rmSparkline from './E1rmSparkline';

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('E1rmSparkline', () => {
  it('shows empty-state row when there is no history and no live e1rm', () => {
    render(
      <E1rmSparkline
        exerciseId={1}
        history={[]}
        todayE1RM={null}
        isNewBest={false}
      />,
    );

    expect(screen.getByText('Est. 1RM history')).toBeInTheDocument();
    expect(screen.getByText('No history yet')).toBeInTheDocument();
  });
});
