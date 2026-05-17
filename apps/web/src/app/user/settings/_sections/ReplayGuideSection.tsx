'use client';

import { useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { useSettingsWithSaved } from '../_components/SavedState';
import { SignalButton } from '@/components/signal/SignalButton';

const palette = signalTokens.surface.planning;

export function ReplayGuideSection() {
  const { settings, updateSetting } = useSettingsWithSaved();
  const [working, setWorking] = useState(false);
  const [done, setDone] = useState(false);

  async function replay() {
    setWorking(true);
    setDone(false);
    const ok = await updateSetting('onboardingDismissed', false);
    setWorking(false);
    if (ok) {
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    }
  }

  const buttonLabel = done
    ? 'Guide will show on Home'
    : working
      ? 'Resetting…'
      : settings.onboardingDismissed
        ? 'Show guide on Home'
        : 'Guide already pending';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SignalButton intent="outlined" onClick={replay} disabled={working}>
        {buttonLabel}
      </SignalButton>
      <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>
        The getting-started guide reappears the next time you open Home.
      </p>
    </div>
  );
}
