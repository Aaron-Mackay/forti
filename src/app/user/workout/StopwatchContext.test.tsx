import React from 'react';
import {render, screen, act, fireEvent} from '@testing-library/react';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {StopwatchProvider, useStopwatch} from './StopwatchContext';

function TestConsumer() {
  const {stopwatch, handleStartStop, handleReset} = useStopwatch();
  return (
    <div>
      <span data-testid="running">{String(stopwatch.isRunning)}</span>
      <span data-testid="pausedTime">{stopwatch.pausedTime}</span>
      <span data-testid="startTimestamp">{stopwatch.startTimestamp ?? 'null'}</span>
      <button onClick={handleStartStop}>Toggle</button>
      <button onClick={handleReset}>Reset</button>
    </div>
  );
}

function ThrowingConsumer() {
  useStopwatch();
  return null;
}

describe('StopwatchContext', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('provides initial state: not running, no timestamp, zero pausedTime', () => {
    render(
      <StopwatchProvider>
        <TestConsumer/>
      </StopwatchProvider>
    );
    expect(screen.getByTestId('running').textContent).toBe('false');
    expect(screen.getByTestId('pausedTime').textContent).toBe('0');
    expect(screen.getByTestId('startTimestamp').textContent).toBe('null');
  });

  it('starts the stopwatch when toggled from stopped', () => {
    render(
      <StopwatchProvider>
        <TestConsumer/>
      </StopwatchProvider>
    );
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('running').textContent).toBe('true');
    expect(screen.getByTestId('startTimestamp').textContent).not.toBe('null');
  });

  it('pauses the stopwatch and accumulates pausedTime when toggled while running', () => {
    const now = Date.now();
    render(
      <StopwatchProvider>
        <TestConsumer/>
      </StopwatchProvider>
    );

    // Start
    fireEvent.click(screen.getByText('Toggle'));
    expect(screen.getByTestId('running').textContent).toBe('true');

    // Advance 1 second (10 deciseconds)
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // Stop
    act(() => {
      vi.setSystemTime(new Date(now + 1000));
      fireEvent.click(screen.getByText('Toggle'));
    });

    expect(screen.getByTestId('running').textContent).toBe('false');
    expect(screen.getByTestId('startTimestamp').textContent).toBe('null');
    // pausedTime should be 10 deciseconds (1000ms / 100)
    expect(Number(screen.getByTestId('pausedTime').textContent)).toBe(10);
  });

  it('resets all state to zero', () => {
    render(
      <StopwatchProvider>
        <TestConsumer/>
      </StopwatchProvider>
    );

    // Start then reset
    fireEvent.click(screen.getByText('Toggle'));
    fireEvent.click(screen.getByText('Reset'));

    expect(screen.getByTestId('running').textContent).toBe('false');
    expect(screen.getByTestId('pausedTime').textContent).toBe('0');
    expect(screen.getByTestId('startTimestamp').textContent).toBe('null');
  });

  it('throws when useStopwatch is used outside a provider', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<ThrowingConsumer/>)).toThrow('useStopwatch must be used within a StopwatchProvider');
    consoleError.mockRestore();
  });
});
