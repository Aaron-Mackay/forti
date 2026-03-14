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

    // Select 1:00 (600 deciseconds) preset — this auto-starts the stopwatch
    fireEvent.click(screen.getByRole('button', {name: /set notification timer/i}));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: '1:00'}));
    });

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

function setupAudioContextMock() {
  const stopFn = vi.fn();
  const startFn = vi.fn();
  const connectFn = vi.fn();
  const closeFn = vi.fn();
  const setValueAtTimeFn = vi.fn();
  const exponentialRampFn = vi.fn();
  const MockAudioContext = vi.fn().mockImplementation(() => ({
    currentTime: 0,
    destination: {},
    close: closeFn,
    createOscillator: vi.fn().mockReturnValue({
      connect: connectFn,
      type: 'sine',
      frequency: {value: 440},
      start: startFn,
      stop: stopFn,
      onended: null,
    }),
    createGain: vi.fn().mockReturnValue({
      connect: connectFn,
      gain: {
        setValueAtTime: setValueAtTimeFn,
        exponentialRampToValueAtTime: exponentialRampFn,
      },
    }),
  }));
  Object.defineProperty(window, 'AudioContext', {value: MockAudioContext, configurable: true, writable: true});
  return {MockAudioContext, startFn, stopFn};
}

describe('MediaSession', () => {
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
      if (timeout) { clearTimeout(timeout); rafTimers.delete(id); }
    };

    // Mock MediaMetadata (not available in jsdom)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).MediaMetadata = vi.fn().mockImplementation((data: object) => ({...data}));

    // Mock AudioContext with createMediaStreamDestination for silent audio
    const MockAudioContext = vi.fn().mockImplementation(() => ({
      currentTime: 0,
      destination: {},
      close: vi.fn().mockResolvedValue(undefined),
      createMediaStreamDestination: vi.fn().mockReturnValue({stream: {}}),
      createOscillator: vi.fn().mockReturnValue({
        connect: vi.fn(), type: 'sine', frequency: {value: 440},
        start: vi.fn(), stop: vi.fn(), onended: null,
      }),
      createGain: vi.fn().mockReturnValue({
        connect: vi.fn(),
        gain: {setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn()},
      }),
    }));
    Object.defineProperty(window, 'AudioContext', {value: MockAudioContext, configurable: true, writable: true});

    // Replace Audio constructor so jsdom's unimplemented play/pause don't fire
    Object.defineProperty(window, 'Audio', {
      value: vi.fn().mockImplementation(() => ({
        play: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn(),
        srcObject: null,
        loop: false,
      })),
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    window.requestAnimationFrame = originalRequestAnimationFrame;
    window.cancelAnimationFrame = originalCancelAnimationFrame;
    vi.restoreAllMocks();
  });

  function setupMediaSessionMock() {
    const setActionHandler = vi.fn();
    const mediaSession = {
      metadata: null as MediaMetadata | null,
      playbackState: 'none' as MediaSessionPlaybackState,
      setActionHandler,
    };
    Object.defineProperty(navigator, 'mediaSession', {value: mediaSession, configurable: true, writable: true});
    return {mediaSession, setActionHandler};
  }

  it('activates MediaSession with playbackState playing when stopwatch starts', async () => {
    const {mediaSession} = setupMediaSessionMock();
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /start stopwatch/i}));
    });
    expect(mediaSession.playbackState).toBe('playing');
    expect(mediaSession.metadata).not.toBeNull();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((mediaSession.metadata as any)?.artist).toBe('Forti Workout');
  });

  it('registers play, pause, and stop action handlers when stopwatch starts', async () => {
    const {setActionHandler} = setupMediaSessionMock();
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /start stopwatch/i}));
    });
    expect(setActionHandler).toHaveBeenCalledWith('play', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('pause', expect.any(Function));
    expect(setActionHandler).toHaveBeenCalledWith('stop', expect.any(Function));
  });

  it('sets MediaSession playbackState to paused when stopwatch is paused', async () => {
    const {mediaSession} = setupMediaSessionMock();
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /start stopwatch/i}));
    });
    expect(mediaSession.playbackState).toBe('playing');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /stop stopwatch/i}));
    });
    expect(mediaSession.playbackState).toBe('paused');
  });

  it('deactivates MediaSession with playbackState none when stopwatch is reset', async () => {
    const {mediaSession} = setupMediaSessionMock();
    renderWithProvider();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /start stopwatch/i}));
    });
    expect(mediaSession.playbackState).toBe('playing');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /reset stopwatch/i}));
    });
    expect(mediaSession.playbackState).toBe('none');
  });
});

describe('fireRestNotification', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates a Notification when permission is granted', () => {
    const MockNotification = setupNotificationMock('granted');
    setupAudioContextMock();
    fireRestNotification();
    expect(MockNotification).toHaveBeenCalledWith('Rest timer complete', expect.objectContaining({
      body: 'Time to start your next set!',
    }));
  });

  it('does not create a Notification when permission is denied', () => {
    const MockNotification = setupNotificationMock('denied');
    setupAudioContextMock();
    fireRestNotification();
    expect(MockNotification).not.toHaveBeenCalled();
  });

  it('plays three beeps via AudioContext', () => {
    setupNotificationMock('denied');
    const {MockAudioContext, startFn} = setupAudioContextMock();
    fireRestNotification();
    expect(MockAudioContext).toHaveBeenCalledTimes(1);
    expect(startFn).toHaveBeenCalledTimes(3);
  });
});
