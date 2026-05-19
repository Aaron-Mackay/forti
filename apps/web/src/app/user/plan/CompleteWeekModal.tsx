'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Overlay } from '@/components/signal/overlay';
import { fetchJson } from '@lib/fetchWrapper';
import { signalTokens } from '@lib/signal/tokens';

export interface CompleteWeekModalProps {
  open: boolean;
  weekNumber: number;
  done: number;
  total: number;
  incompleteWorkoutNames: string[];
  onClose: () => void;
  onSuccess?: () => void;
}

export function CompleteWeekModal({
  open,
  weekNumber,
  done,
  total,
  incompleteWorkoutNames,
  onClose,
  onSuccess,
}: CompleteWeekModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const palette = signalTokens.surface.planning;

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetchJson('/api/plan/active/complete-week', { method: 'POST' });
      setAnnouncement(`Week ${weekNumber} complete`);
      router.refresh();
      onSuccess?.();
      onClose();
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <span role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clipPath: 'inset(50%)' }}>
        {announcement}
      </span>
      <Overlay
        open={open}
        onClose={loading ? () => undefined : onClose}
        title={`Complete week ${weekNumber}?`}
        eyebrow="Confirm · current week"
        size="sm"
        accent
        primaryAction={{
          label: loading ? 'Completing...' : `Complete week ${weekNumber}`,
          onClick: () => void handleConfirm(),
          disabled: loading,
        }}
        secondaryAction={{
          label: 'Keep going',
          onClick: onClose,
          disabled: loading,
        }}
      >
        <div style={{ display: 'grid', gap: 12, color: palette.inkMid, fontSize: 14, lineHeight: 1.5 }}>
          <div style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 12, color: palette.ink }}>
            {done} of {total} sessions logged
          </div>
          {done < total ? (
            <>
              <div>Marking {incompleteWorkoutNames.length} unfinished workout(s) as complete:</div>
              <ul
                style={{
                  margin: 0,
                  padding: '0 0 0 18px',
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 12,
                  color: palette.ink,
                }}
              >
                {incompleteWorkoutNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </>
          ) : (
            <div>All sessions logged. Confirm to close out the week.</div>
          )}
        </div>
      </Overlay>
    </>
  );
}
