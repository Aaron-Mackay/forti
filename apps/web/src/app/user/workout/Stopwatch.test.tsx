import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import Stopwatch from "./Stopwatch";
import { DEFAULT_SETTINGS } from "@/types/settingsTypes";

vi.mock("@lib/providers/SettingsProvider", () => ({
  useSettings: () => ({ settings: DEFAULT_SETTINGS, loading: false, error: null, clearError: vi.fn(), updateSetting: vi.fn() }),
}));

describe("Stopwatch", () => {
  let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
  let originalCancelAnimationFrame: typeof window.cancelAnimationFrame;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00.000Z"));

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
  });

  it("renders with initial pausedTime", () => {
    render(
      <Stopwatch
        isRunning={false}
        startTimestamp={null}
        pausedTime={123}
        onStartStop={() => {}}
        onReset={() => {}}
        isStopwatchVisible={true}
        setIsStopwatchVisible={() => {}}
      />
    );
    expect(screen.getByText("0:12:3")).toBeInTheDocument();
  });

  it("calls onStartStop when main button is clicked", () => {
    const onStartStop = vi.fn();
    render(
      <Stopwatch
        isRunning={false}
        startTimestamp={null}
        pausedTime={0}
        onStartStop={onStartStop}
        onReset={() => {}}
        isStopwatchVisible={true}
        setIsStopwatchVisible={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /start stopwatch/i }));
    expect(onStartStop).toHaveBeenCalled();
  });

  it("calls onReset when reset button is clicked", () => {
    const onReset = vi.fn();
    render(
      <Stopwatch
        isRunning={false}
        startTimestamp={null}
        pausedTime={0}
        onStartStop={() => {}}
        onReset={onReset}
        isStopwatchVisible={true}
        setIsStopwatchVisible={() => {}}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /reset stopwatch/i }));
    expect(onReset).toHaveBeenCalled();
  });

  it("updates display when running", async () => {
    const now = Date.now();
    render(
      <Stopwatch
        isRunning={true}
        startTimestamp={now}
        pausedTime={0}
        onStartStop={() => {}}
        onReset={() => {}}
        isStopwatchVisible={true}
        setIsStopwatchVisible={() => {}}
      />
    );
    await act(async () => {
      vi.advanceTimersByTime(1500); // 1.5 seconds = 15 deciseconds
    });
    // Find the element by class and check its text content
    const timeEl = document.querySelector('.stopwatch-time');
    expect(timeEl).not.toBeNull();
    expect(timeEl?.textContent).toBe("0:01:4")
  });
});