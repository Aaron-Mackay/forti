import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SignalTabs } from './SignalTabs';

const tabs = [
  { value: 'a', label: 'A' },
  { value: 'b', label: 'B', count: 3 },
  { value: 'c', label: 'C' },
];

describe('SignalTabs', () => {
  it('renders a tablist with one selected tab', () => {
    render(<SignalTabs tabs={tabs} value="a" onChange={() => {}} ariaLabel="Test" />);
    const list = screen.getByRole('tablist', { name: 'Test' });
    expect(list).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /A/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /B/ })).toHaveAttribute('aria-selected', 'false');
  });

  it('moves selection with arrow keys', () => {
    const onChange = vi.fn();
    render(<SignalTabs tabs={tabs} value="a" onChange={onChange} ariaLabel="Test" />);
    const first = screen.getByRole('tab', { name: /A/ });
    first.focus();
    fireEvent.keyDown(first, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('b');
    fireEvent.keyDown(first, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('c');
    fireEvent.keyDown(first, { key: 'End' });
    expect(onChange).toHaveBeenCalledWith('c');
    fireEvent.keyDown(first, { key: 'Home' });
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('renders an optional count beside the label', () => {
    render(<SignalTabs tabs={tabs} value="a" onChange={() => {}} ariaLabel="Test" />);
    const tabB = screen.getByRole('tab', { name: /B/ });
    expect(tabB).toHaveTextContent('B');
    expect(tabB).toHaveTextContent('3');
  });
});
