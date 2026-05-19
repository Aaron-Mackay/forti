import React from 'react';
import { act, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SaveCheckInDraftRequest } from '@lib/contracts/checkIn';
import { useCheckInAutosave } from './useCheckInAutosave';

function Harness({
  payload,
  persist,
  setError,
  onSavingChange,
  onSaved,
}: {
  payload: SaveCheckInDraftRequest;
  persist: (payload: SaveCheckInDraftRequest) => Promise<void>;
  setError: (value: string) => void;
  onSavingChange: (value: boolean) => void;
  onSaved: () => void;
}) {
  useCheckInAutosave({
    enabled: true,
    payload,
    persist,
    setError,
    onSavingChange,
    onSaved,
    delayMs: 100,
  });

  return null;
}

describe('useCheckInAutosave', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not reschedule autosave when only callback identities change', async () => {
    vi.useFakeTimers();

    const firstPayload: SaveCheckInDraftRequest = {
      customResponses: { mood: 'ok' },
      completedWorkouts: 1,
      plannedWorkouts: 2,
    };
    const secondPayload: SaveCheckInDraftRequest = {
      customResponses: { mood: 'great' },
      completedWorkouts: 1,
      plannedWorkouts: 2,
    };

    const firstPersist = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const secondPersist = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
    const thirdPersist = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);

    const { rerender } = render(
      <Harness
        payload={firstPayload}
        persist={firstPersist}
        setError={vi.fn()}
        onSavingChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    rerender(
      <Harness
        payload={secondPayload}
        persist={secondPersist}
        setError={vi.fn()}
        onSavingChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(110);
      await Promise.resolve();
    });

    expect(secondPersist).toHaveBeenCalledTimes(1);

    rerender(
      <Harness
        payload={secondPayload}
        persist={thirdPersist}
        setError={vi.fn()}
        onSavingChange={vi.fn()}
        onSaved={vi.fn()}
      />
    );

    await act(async () => {
      vi.advanceTimersByTime(110);
      await Promise.resolve();
    });

    expect(thirdPersist).not.toHaveBeenCalled();
  });
});
