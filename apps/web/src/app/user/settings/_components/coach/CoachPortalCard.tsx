'use client';

import { useRef, useState, type CSSProperties } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { signalTokens } from '@lib/signal/tokens';
import { SignalButton } from '@/components/signal/SignalButton';
import { Overlay } from '@/components/signal/overlay';
import type { CoachInfo } from './useCoachAdmin';

const palette = signalTokens.surface.planning;

type Props = {
  info: CoachInfo | null;
  busy: string | null;
  onInvite: (email: string) => void;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onRemoveClient: (id: string) => void;
  onUploadLogo: (blob: Blob) => Promise<void>;
  onRemoveLogo: () => Promise<void>;
  onActivateCoachMode: () => void;
};

const subheadingStyle: CSSProperties = {
  fontFamily: signalTokens.fontVar.mono,
  fontSize: 10,
  color: palette.inkLight,
  letterSpacing: '0.14em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const rowCardStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  padding: '9px 14px',
  border: `1px solid ${palette.border}`,
  borderRadius: signalTokens.radii.card,
  background: palette.surface,
};

export function CoachPortalCard({
  info,
  busy,
  onInvite,
  onAccept,
  onReject,
  onRemoveClient,
  onUploadLogo,
  onRemoveLogo,
  onActivateCoachMode,
}: Props) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!info) return null;

  if (!info.coachModeActive) {
    return (
      <section
        style={{
          padding: '16px',
          border: `1px dashed ${palette.border}`,
          borderRadius: signalTokens.radii.cardLarge,
          background: palette.bg,
        }}
      >
        <div style={subheadingStyle}>Coach portal</div>
        <p style={{ fontSize: 13, color: palette.inkMid, margin: '0 0 12px', maxWidth: 460 }}>
          Logo upload, accept/reject pending requests, and client roster all live here too — collapsed while
          coach mode is off.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 8,
            marginBottom: 14,
          }}
        >
          {[
            { label: 'Invite code', value: '—' },
            { label: 'Invite by email', value: '—' },
            { label: 'Pending', value: '—' },
            { label: 'Confirmed', value: '—' },
          ].map((cell) => (
            <div
              key={cell.label}
              style={{
                border: `1px solid ${palette.border}`,
                borderRadius: signalTokens.radii.card,
                background: palette.surfaceAlt,
                padding: '10px 12px',
              }}
            >
              <div
                style={{
                  fontFamily: signalTokens.fontVar.mono,
                  fontSize: 10,
                  color: palette.inkLight,
                  marginBottom: 4,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                }}
              >
                {cell.label}
              </div>
              <div
                style={{
                  fontFamily: signalTokens.fontVar.cond,
                  fontSize: 22,
                  fontWeight: 700,
                  color: palette.inkLight,
                  lineHeight: 1,
                }}
              >
                {cell.value}
              </div>
            </div>
          ))}
        </div>
        <SignalButton intent="outlined" onClick={onActivateCoachMode}>
          Turn on coach mode
        </SignalButton>
      </section>
    );
  }

  function copy(value: string, kind: 'code' | 'link') {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1800);
    });
  }

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCropUrl(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCropPixels(null);
      setCropOpen(true);
    };
    reader.readAsDataURL(file);
  }

  async function confirmCrop() {
    if (!cropUrl || !cropPixels) return;
    setCropOpen(false);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('Image load failed'));
        el.src = cropUrl!;
        if (el.complete && el.naturalWidth > 0) resolve(el);
      });
      const SIZE = 200;
      const canvas = document.createElement('canvas');
      canvas.width = SIZE;
      canvas.height = SIZE;
      canvas.getContext('2d')!.drawImage(
        img,
        cropPixels.x,
        cropPixels.y,
        cropPixels.width,
        cropPixels.height,
        0,
        0,
        SIZE,
        SIZE,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', 0.9),
      );
      await onUploadLogo(blob);
    } catch {
      // surface via parent error UI
    }
  }

  const inviteLink = info.coachCode
    ? `${process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : '')}/coach/${info.coachCode}`
    : '';

  return (
    <section
      style={{
        padding: '18px 16px',
        border: `1px solid ${palette.border}`,
        borderRadius: signalTokens.radii.cardLarge,
        background: palette.surface,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
    >
      <div>
        <div style={subheadingStyle}>Coach portal</div>
        <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, maxWidth: 460 }}>
          Share your code or send email invites. Manage incoming requests and your confirmed clients here.
        </p>
      </div>

      <div>
        <div style={subheadingStyle}>Invite code</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <code
            style={{
              flex: 1,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.cell,
              padding: '8px 12px',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 14,
              letterSpacing: '0.3em',
              background: palette.surfaceAlt,
              color: palette.ink,
            }}
          >
            {info.coachCode ?? '—'}
          </code>
          <SignalButton
            intent="outlined"
            onClick={() => info.coachCode && copy(info.coachCode, 'code')}
            disabled={!info.coachCode}
          >
            {copied === 'code' ? 'Copied' : 'Copy'}
          </SignalButton>
        </div>
      </div>

      <div>
        <div style={subheadingStyle}>Shareable link</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <code
            style={{
              flex: 1,
              minWidth: 0,
              border: `1px solid ${palette.border}`,
              borderRadius: signalTokens.radii.cell,
              padding: '8px 12px',
              fontFamily: signalTokens.fontVar.mono,
              fontSize: 11,
              background: palette.surfaceAlt,
              color: palette.ink,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {inviteLink || '—'}
          </code>
          <SignalButton intent="outlined" onClick={() => inviteLink && copy(inviteLink, 'link')} disabled={!inviteLink}>
            {copied === 'link' ? 'Copied' : 'Copy'}
          </SignalButton>
        </div>
      </div>

      <div>
        <div style={subheadingStyle}>Invite by email</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="client@example.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inviteEmail.trim()) {
                onInvite(inviteEmail.trim());
                setInviteEmail('');
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              border: `1px solid ${inviteEmail ? palette.borderStrong : palette.border}`,
              borderRadius: signalTokens.radii.cell,
              padding: '8px 12px',
              fontSize: 14,
              fontFamily: signalTokens.fontVar.body,
              background: palette.surface,
              color: palette.ink,
              outline: 'none',
            }}
          />
          <SignalButton
            intent="primary"
            disabled={busy === 'invite' || !inviteEmail.trim()}
            onClick={() => {
              if (inviteEmail.trim()) {
                onInvite(inviteEmail.trim());
                setInviteEmail('');
              }
            }}
          >
            Send
          </SignalButton>
        </div>
      </div>

      <div>
        <div style={subheadingStyle}>Pending requests</div>
        {info.pendingRequests.length === 0 ? (
          <p style={{ fontSize: 12, color: palette.inkLight, margin: 0 }}>No pending requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {info.pendingRequests.map((req) => (
              <div key={req.id} style={rowCardStyle}>
                <span style={{ fontSize: 14, color: palette.ink }}>{req.client.name}</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <SignalButton intent="primary" size="sm" disabled={!!busy} onClick={() => onAccept(req.id)}>
                    Accept
                  </SignalButton>
                  <SignalButton intent="urgent" size="sm" disabled={!!busy} onClick={() => onReject(req.id)}>
                    Reject
                  </SignalButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={subheadingStyle}>Confirmed clients</div>
        {info.confirmedClients.length === 0 ? (
          <p style={{ fontSize: 12, color: palette.inkLight, margin: 0 }}>No confirmed clients.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {info.confirmedClients.map((client) => (
              <div key={client.id} style={rowCardStyle}>
                <span style={{ fontSize: 14, color: palette.ink }}>{client.name}</span>
                <SignalButton intent="urgent" size="sm" disabled={!!busy} onClick={() => onRemoveClient(client.id)}>
                  Remove
                </SignalButton>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div style={subheadingStyle}>Branding</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {info.coachLogoUrl ? (
            <img
              src={info.coachLogoUrl}
              alt="Coach logo"
              style={{
                width: 64,
                height: 64,
                objectFit: 'contain',
                borderRadius: signalTokens.radii.card,
                border: `1px solid ${palette.border}`,
                background: palette.surfaceAlt,
              }}
            />
          ) : (
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: signalTokens.radii.card,
                border: `1px dashed ${palette.border}`,
                background: palette.surfaceAlt,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: signalTokens.fontVar.mono,
                fontSize: 10,
                color: palette.inkLight,
              }}
            >
              LOGO
            </div>
          )}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={handleLogoFile}
            />
            <SignalButton intent="outlined" disabled={busy === 'logo'} onClick={() => fileInputRef.current?.click()}>
              {info.coachLogoUrl ? 'Replace' : 'Upload'}
            </SignalButton>
            {info.coachLogoUrl ? (
              <SignalButton intent="urgent" disabled={busy === 'logo'} onClick={onRemoveLogo}>
                Remove
              </SignalButton>
            ) : null}
          </div>
        </div>
      </div>

      <Overlay
        open={cropOpen}
        onClose={() => setCropOpen(false)}
        title="Crop logo"
        size="md"
        primaryAction={{ label: 'Save', onClick: confirmCrop }}
        ghostAction={{ label: 'Cancel', onClick: () => setCropOpen(false) }}
      >
        <div style={{ position: 'relative', height: 320, background: '#000', borderRadius: signalTokens.radii.card, overflow: 'hidden' }}>
          {cropUrl ? (
            <Cropper
              image={cropUrl}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_area, pixels) => setCropPixels(pixels)}
            />
          ) : null}
        </div>
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: signalTokens.fontVar.mono, fontSize: 11, color: palette.inkLight }}>Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ flex: 1 }}
          />
        </div>
      </Overlay>
    </section>
  );
}
