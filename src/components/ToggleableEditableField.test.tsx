// ToggleableEditableField.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ToggleableEditableField } from './ToggleableEditableField';

describe('ToggleableEditableField', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders in display mode when isInEditMode is false', () => {
    render(
      <ToggleableEditableField
        value="Display Text"
        isInEditMode={false}
        onChange={mockOnChange}
      />
    );
    expect(screen.getByText('Display Text')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('renders in edit mode with input when isInEditMode is true', () => {
    render(
      <ToggleableEditableField
        value="Edit Text"
        isInEditMode
        onChange={mockOnChange}
      />
    );
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue('Edit Text');
  });

  it('calls onChange on input change', () => {
    render(
      <ToggleableEditableField
        value="Initial"
        isInEditMode
        onChange={mockOnChange}
      />
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Updated' },
    });
    expect(mockOnChange).toHaveBeenCalledWith('Updated');
  });

  it('uses the correct input type when provided', () => {
    render(
      <ToggleableEditableField
        value={123}
        type="number"
        isInEditMode
        onChange={mockOnChange}
      />
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveAttribute('type', 'number');
  });
});
