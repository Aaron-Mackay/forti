import React from 'react';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {vi, describe, it, expect, beforeEach, afterEach} from 'vitest';
import AppBarStopwatch, {fireRestNotification} from './AppBarStopwatch';
import {StopwatchProvider} from './StopwatchContext';
import {DEFAULT_SETTINGS} from '@/types/settingsTypes';

vi.mock('@lib/providers/SettingsProvider', () => ({
  useSettings: () => ({settings: DEFAULT_SETTINGS, loading: false, error: null, clearError: vi.fn(), updateSetting: vi.fn()}),
}));

vi.mock('@/components/CustomAppBar', () => ({APPBAR_HEIGHT: 56}));

function renderWithProvider() {
  return render(
    <StopwatchProvider>
      <AppBarStopwatch/>
    </StopwatchProvider>
  );
}

type MockNotificationConstructor = ReturnType<typeof vi.fn> & {
  permission: NotificationPermission;
  requestPermission: ReturnType<typeof vi.fn>;
};

function setupNotificationMock(permission: NotificationPermission = 'granted'): MockNotificationConstructor {
  const MockNotification = vi.fn().mockImplementation(() => ({})) as MockNotificationConstructor;
  MockNotification.permission = permission;
  MockNotification.requestPermission = vi.fn().mockResolvedValue(permission);
  Object.defineProperty(window, 'Notification', {value: MockNotification, configurable: true, writable: true});
  return MockNotification;
}

describe('AppBarStopwatch', () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));

    originalRequestAnimationFrame = window.requestAnimationFrame;
    originalCancelAnimationFrame = window.cancelAnimationFrame;
    let rafId = 0;
    const rafTimers = new Map<number, ReturnType<typeof setTimeout>>();
    window.requestAnimationFrame = (cb: FrameRequestCallback): number => {
      rafId += 1;
      const timeout = setTimeout(() => cb(performance.now()), 16);
      rafTimers.set(rafId, timeout);
      return rafId;
    };
    window.cancelAnimationFrame = (id: number) => {
      const timeout = rafTimers.get(id);
      if (timeout) {
        clearTimeout(timeout);
        rafTimers.delete(id);
      }
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.restoreAllMocks();
  });

  it('renders the stopwatch with controls', () => {
    renderWithProvider();
    expect(screen.getByRole('button', {name: /reset stopwatch/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /start stopwatch/i})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: /set notification timer/i})).toBeInTheDocument();
  });

  it('opens the notify-at popover when bell is clicked', () => {
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    expect(screen.getByText('Notify at')).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '1:00'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '1:30'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '2:00'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: '3:00'})).toBeInTheDocument();
  });

  it('sets notifyAt when a preset is selected', async () => {
    setupNotificationMock('default');
    renderWithProvider();
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: '2:00'}));
    });
    // Re-open — the 2:00 button should now be contained (active)
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    const btn = screen.getByRole('button', {name: '2:00'});
    expect(btn.className).toMatch(/contained/i);
  });

  it('clears notifyAt when the active preset is clicked again', async () => {
    setupNotificationMock('granted');
    renderWithProvider();
    // Select
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: '1:00'}));
    });
    // Deselect same preset
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: '1:00'}));
    });
    // Re-open — 1:00 should no longer be active
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    const btn = screen.getByRole('button', {name: '1:00'});
    expect(btn.className).not.toMatch(/contained/i);
  });

  it('fires notification when stopwatch crosses notifyAt', async () => {
    const MockNotification = setupNotificationMock('granted');
    const vibrateSpy = vi.fn();
    Object.defineProperty(navigator, 'vibrate', {value: vibrateSpy, configurable: true});

    renderWithProvider();

    // Select 1:00 (600 deciseconds) preset
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: '1:00'}));
    });

    // Start the stopwatch
    fireEvent.click(screen.getByRole('button', {name: /start stopwatch/i}));

    // Advance time past 1 minute (60s = 600 deciseconds)
    await act(async () => {
      vi.advanceTimersByTime(61000);
    });

    expect(MockNotification).toHaveBeenCalledWith('Rest timer complete', expect.objectContaining({
      body: 'Time to start your next set!',
    }));
    expect(vibrateSpy).toHaveBeenCalled();
  });
});

describe('fireRestNotification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Notification when permission is granted', () => {
    const MockNotification = setupNotificationMock('granted');
    fireRestNotification();
    expect(MockNotification).toHaveBeenCalledWith('Rest timer complete', expect.objectContaining({
      body: 'Time to start your next set!',
    }));
  });

  it('does not create a Notification when permission is denied', () => {
    const MockNotification = setupNotificationMock('denied');
    fireRestNotification();
    expect(MockNotification).not.toHaveBeenCalled();
  });
});
