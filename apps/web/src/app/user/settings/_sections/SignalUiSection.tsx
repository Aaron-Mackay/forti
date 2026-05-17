'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import { SignalToggle } from '@/components/signal/SignalToggle';
import { Overlay } from '@/components/signal/overlay';

const palette = signalTokens.surface.planning;

export function SignalUiSection() {
  const { settings, updateSetting } = useSettingsWithSaved();
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function commitOff() {
    setConfirmOpen(false);
    const ok = await updateSetting('signalUiEnabled', false);
    if (ok) router.refresh();
  }

  async function handleChange(next: boolean) {
    if (settings.signalUiEnabled && !next) {
      setConfirmOpen(true);
      return;
    }
    const ok = await updateSetting('signalUiEnabled', next);
    if (ok) router.refresh();
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '12px 14px',
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.card,
        background: palette.surface,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: signalTokens.fontVar.body, fontSize: 14, fontWeight: 600, color: palette.ink }}>
          Use Signal UI
        </div>
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            marginTop: 2,
            letterSpacing: '0.02em',
          }}
        >
          Toggle the in-progress redesign for this account.
        </div>
      </div>
      <SignalToggle
        checked={settings.signalUiEnabled}
        onChange={handleChange}
        ariaLabel="Use Signal UI"
      />

      <Overlay
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Switch back to the legacy UI?"
        size="sm"
        primaryAction={{ label: 'Switch back', onClick: commitOff }}
        ghostAction={{ label: 'Stay on Signal', onClick: () => setConfirmOpen(false) }}
      >
        <p style={{ fontSize: 13, color: palette.inkMid, margin: 0 }}>
          You can re-enable Signal at any time from this screen.
        </p>
      </Overlay>
    </div>
  );
}
