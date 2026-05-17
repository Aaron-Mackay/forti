'use client';

import { useState } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { SignalButton } from '@/components/signal/SignalButton';

const palette = signalTokens.surface.planning;

type Props = {
  initialName: string;
  initialImage: string | null;
};

export function ProfileSection({ initialName, initialImage }: Props) {
  const [name, setName] = useState(initialName);
  const [savedName, setSavedName] = useState(initialName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = name.trim();
  const dirty = trimmed !== savedName && trimmed !== '';

  const initials = savedName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? 'Failed to save name');
      } else {
        setSavedName(trimmed);
      }
    } catch {
      setError('Failed to save name');
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setName(savedName);
    setError(null);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          aria-hidden="true"
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: palette.surfaceAlt,
            border: `1px solid ${palette.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 22,
            color: palette.ink,
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {initialImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={initialImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials || '—'
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <SignalButton intent="outlined" disabled>
            Change photo
          </SignalButton>
          <span
            style={{
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 9,
              letterSpacing: '0.16em',
              color: palette.inkLight,
              textTransform: 'uppercase',
            }}
          >
            Coming soon
          </span>
        </div>
      </div>

      <div>
        <label
          htmlFor="settings-profile-name"
          style={{
            display: 'block',
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 10,
            color: palette.inkLight,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginBottom: 6,
          }}
        >
          Name
        </label>
        <input
          id="settings-profile-name"
          value={name}
          maxLength={100}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
          style={{
            width: '100%',
            border: `1px solid ${dirty ? palette.borderStrong : palette.border}`,
            borderRadius: signalTokens.radii.cell,
            padding: '9px 12px',
            fontSize: 14,
            fontFamily: signalTokens.fontVar.body,
            color: palette.ink,
            background: palette.surface,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {error ? (
        <div
          style={{
            fontFamily: signalTokens.fontVar.mono,
            fontSize: 11,
            color: signalTokens.status.urgent,
          }}
        >
          {error}
        </div>
      ) : null}

      {dirty ? (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <SignalButton intent="ghost" onClick={discard} disabled={busy}>
            Discard
          </SignalButton>
          <SignalButton intent="primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : 'Save name'}
          </SignalButton>
        </div>
      ) : null}
    </div>
  );
}
