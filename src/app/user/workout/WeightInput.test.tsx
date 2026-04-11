import {render, screen} from '@testing-library/react';
import {describe, expect, it, vi} from 'vitest';
import WeightInput from './WeightInput';

describe('WeightInput', () => {
  it('uses the unit as the default label when a tracked unit exists', () => {
    render(
      <WeightInput
        valueKg={100}
        unit="kg"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('kg')).toBeInTheDocument();
  });

  it('falls back to Weight when no unit label exists', () => {
    render(
      <WeightInput
        valueKg={100}
        unit="none"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Weight')).toBeInTheDocument();
  });

  it('preserves an explicit custom label', () => {
    render(
      <WeightInput
        valueKg={100}
        unit="kg"
        label="Working Set"
        onChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Working Set')).toBeInTheDocument();
  });
});
