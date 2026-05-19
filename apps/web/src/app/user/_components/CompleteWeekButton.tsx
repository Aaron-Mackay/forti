'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signalTokens } from '@lib/signal/tokens';
import { fetchJson } from '@lib/fetchWrapper';

const palette = signalTokens.surface.gym;

export function CompleteWeekButton() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetchJson('/api/plan/active/complete-week', { method: 'POST' });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (confirming) {
    return (
      <div
        style={{
          background: signalTokens.signal.base,
          padding: '12px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 600, color: palette.ink, fontFamily: signalTokens.fontVar.body }}>
          Start next week?
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            style={{
              background: 'transparent',
              border: `1px solid ${palette.ink}`,
              borderRadius: signalTokens.radii.card,
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: palette.ink,
              cursor: 'pointer',
              fontFamily: signalTokens.fontVar.body,
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            style={{
              background: palette.ink,
              border: 'none',
              borderRadius: signalTokens.radii.card,
              padding: '4px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: signalTokens.signal.base,
              cursor: loading ? 'wait' : 'pointer',
              fontFamily: signalTokens.fontVar.body,
            }}
          >
            {loading ? '···' : 'Confirm'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        background: signalTokens.signal.base,
        color: palette.ink,
        border: 'none',
        padding: '14px 20px',
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: signalTokens.fontVar.body,
      }}
    >
      <span>Start next week</span>
      <svg viewBox="0 0 24 24" width={18} height={18} fill="none" stroke={palette.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
    </button>
  );
}
