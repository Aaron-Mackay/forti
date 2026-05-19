'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useCoachAdmin } from '../_components/coach/useCoachAdmin';
import { CoachModeCard } from '../_components/coach/CoachModeCard';
import { CoachPortalCard } from '../_components/coach/CoachPortalCard';

const palette = signalTokens.surface.planning;

export function CoachModeSection() {
  const admin = useCoachAdmin();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {admin.actionError ? (
        <div
          style={{
            padding: '10px 14px',
            border: `1px solid ${signalTokens.status.urgent}`,
            borderRadius: signalTokens.radii.card,
            background: signalTokens.status.urgentDim,
            color: signalTokens.status.urgent,
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span>{admin.actionError}</span>
          <button
            type="button"
            onClick={admin.clearActionError}
            style={{
              appearance: 'none',
              background: 'transparent',
              border: 'none',
              color: signalTokens.status.urgent,
              cursor: 'pointer',
              fontSize: 16,
            }}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      ) : null}
      <CoachModeCard info={admin.info} busy={admin.busy} onToggle={admin.setCoachMode} />
      <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>
        With coach mode on, invite clients, accept requests, and manage your roster from the panel below.
      </p>
      <CoachPortalCard
        info={admin.info}
        busy={admin.busy}
        onInvite={admin.sendInvite}
        onAccept={admin.acceptRequest}
        onReject={admin.rejectRequest}
        onRemoveClient={admin.removeClient}
        onUploadLogo={admin.uploadLogo}
        onRemoveLogo={admin.removeLogo}
        onActivateCoachMode={() => admin.setCoachMode(true)}
      />
    </div>
  );
}
