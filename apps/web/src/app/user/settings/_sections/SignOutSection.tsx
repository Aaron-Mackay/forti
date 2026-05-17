'use client';

import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { signalTokens } from '@lib/signal/tokens';
import { SignalButton } from '@/components/signal/SignalButton';
import { Overlay } from '@/components/signal/overlay';

const palette = signalTokens.surface.planning;

export function SignOutSection() {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <SignalButton intent="urgent" onClick={() => setOpen(true)}>
        Sign out
      </SignalButton>
      <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>
        Signs you out on this device only.
      </p>
      <Overlay
        open={open}
        onClose={() => setOpen(false)}
        title="Sign out?"
        size="sm"
        primaryAction={{ label: 'Sign out', onClick: () => signOut({ callbackUrl: '/login' }) }}
        ghostAction={{ label: 'Cancel', onClick: () => setOpen(false) }}
      >
        <p style={{ fontSize: 13, color: palette.inkMid, margin: 0 }}>
          You will need to sign in again to use Forti on this device.
        </p>
      </Overlay>
    </div>
  );
}
