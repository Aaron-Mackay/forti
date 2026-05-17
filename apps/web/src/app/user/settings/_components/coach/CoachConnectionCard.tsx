'use client';

import { useState, type CSSProperties } from 'react';
import { signalTokens } from '@lib/signal/tokens';
import { SignalButton } from '@/components/signal/SignalButton';
import { Overlay } from '@/components/signal/overlay';
import type { CoachInfo } from './useCoachAdmin';

const palette = signalTokens.surface.planning;

type Props = {
  info: CoachInfo | null;
  busy: string | null;
  onLink: (code: string) => void;
  onCancel: () => void;
  onUnlink: () => void;
};

function StatusDot({ color }: { color: string }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: 7,
        height: 7,
        borderRadius: '50%',
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

const cardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '12px 14px',
  border: `1px solid ${palette.border}`,
  borderRadius: signalTokens.radii.card,
  background: palette.surface,
  flexWrap: 'wrap',
};

const labelStyle: CSSProperties = {
  fontFamily: signalTokens.fontVar.body,
  fontSize: 14,
  fontWeight: 600,
  color: palette.ink,
};

const subLabelStyle: CSSProperties = {
  fontFamily: signalTokens.fontVar.mono,
  fontSize: 11,
  color: palette.inkLight,
  marginTop: 2,
  letterSpacing: '0.02em',
};

export function CoachConnectionCard({ info, busy, onLink, onCancel, onUnlink }: Props) {
  const [codeInput, setCodeInput] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [confirmUnlinkOpen, setConfirmUnlinkOpen] = useState(false);

  if (!info) {
    return (
      <div style={cardStyle} aria-busy="true">
        <span style={{ ...labelStyle, color: palette.inkLight }}>Loading coach…</span>
      </div>
    );
  }

  function handleLinkClick() {
    const code = codeInput.trim();
    if (!/^(\d{6}|\d{8})$/.test(code)) {
      setLocalError('Enter a 6- or 8-digit code');
      return;
    }
    setLocalError(null);
    onLink(code);
    setCodeInput('');
  }

  if (info.currentCoach) {
    return (
      <>
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <StatusDot color={signalTokens.status.ok} />
            <div style={{ minWidth: 0 }}>
              <div style={labelStyle}>
                Linked · <strong style={{ fontWeight: 600 }}>{info.currentCoach.name}</strong>
              </div>
              <div style={subLabelStyle}>Coach can review your check-ins and plans.</div>
            </div>
          </div>
          <SignalButton intent="urgent" onClick={() => setConfirmUnlinkOpen(true)} disabled={busy === 'unlink'}>
            Unlink
          </SignalButton>
        </div>
        <Overlay
          open={confirmUnlinkOpen}
          onClose={() => setConfirmUnlinkOpen(false)}
          title="Unlink coach?"
          size="sm"
          primaryAction={{
            label: 'Unlink',
            onClick: () => {
              setConfirmUnlinkOpen(false);
              onUnlink();
            },
          }}
          ghostAction={{ label: 'Cancel', onClick: () => setConfirmUnlinkOpen(false) }}
        >
          <p style={{ fontSize: 13, color: palette.inkMid, margin: 0 }}>
            {info.currentCoach.name} will lose access to your check-ins and plans. You can re-link with the same code.
          </p>
        </Overlay>
      </>
    );
  }

  if (info.sentRequest?.status === 'Pending') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <StatusDot color={signalTokens.status.warn} />
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>
              Pending · <strong style={{ fontWeight: 600 }}>{info.sentRequest.coach.name}</strong>
            </div>
            <div style={subLabelStyle}>Waiting for your coach to accept.</div>
          </div>
        </div>
        <SignalButton intent="ghost" onClick={onCancel} disabled={busy === 'cancel'}>
          Cancel
        </SignalButton>
      </div>
    );
  }

  if (info.sentRequest?.status === 'Rejected') {
    return (
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
          <StatusDot color={signalTokens.status.urgent} />
          <div style={{ minWidth: 0 }}>
            <div style={labelStyle}>Request declined by {info.sentRequest.coach.name}</div>
            <div style={subLabelStyle}>You can request again with a different code.</div>
          </div>
        </div>
        <SignalButton intent="ghost" onClick={onCancel} disabled={busy === 'cancel'}>
          Dismiss
        </SignalButton>
      </div>
    );
  }

  return (
    <div style={{ ...cardStyle, flexDirection: 'column', alignItems: 'stretch' }}>
      <label
        htmlFor="coach-code-input"
        style={{
          fontFamily: signalTokens.fontVar.mono,
          fontSize: 10,
          color: palette.inkLight,
          letterSpacing: '0.14em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Coach code
      </label>
      <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
        <input
          id="coach-code-input"
          value={codeInput}
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
            setCodeInput(val);
            setLocalError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleLinkClick();
          }}
          inputMode="numeric"
          placeholder="123456"
          style={{
            flex: 1,
            border: `1px solid ${codeInput ? palette.borderStrong : palette.border}`,
            borderRadius: signalTokens.radii.cell,
            padding: '8px 12px',
            fontSize: 14,
            fontFamily: signalTokens.fontVar.mono,
            letterSpacing: '0.3em',
            background: palette.surface,
            color: palette.ink,
            outline: 'none',
            minWidth: 0,
          }}
        />
        <SignalButton
          intent="primary"
          onClick={handleLinkClick}
          disabled={busy === 'link' || (codeInput.length !== 6 && codeInput.length !== 8)}
        >
          Link
        </SignalButton>
      </div>
      {localError ? (
        <div style={{ ...subLabelStyle, color: signalTokens.status.urgent, marginTop: 6 }}>{localError}</div>
      ) : null}
    </div>
  );
}
