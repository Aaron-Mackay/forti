'use client';

import { signalTokens } from '@lib/signal/tokens';
import { useCoachAdmin } from '../_components/coach/useCoachAdmin';
import { CoachConnectionCard } from '../_components/coach/CoachConnectionCard';

const palette = signalTokens.surface.planning;

export function CoachSection() {
  const admin = useCoachAdmin();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {admin.fetchError ? (
        <div
          style={{
            padding: '10px 14px',
            border: `1px solid ${signalTokens.status.urgent}`,
            borderRadius: signalTokens.radii.card,
            background: 'rgba(177,74,53,0.06)',
            color: signalTokens.status.urgent,
            fontSize: 13,
          }}
        >
          {admin.fetchError}
        </div>
      ) : null}
      {admin.actionError ? (
        <div
          style={{
            padding: '10px 14px',
            border: `1px solid ${signalTokens.status.urgent}`,
            borderRadius: signalTokens.radii.card,
            background: 'rgba(177,74,53,0.06)',
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
      <CoachConnectionCard
        info={admin.info}
        busy={admin.busy}
        onLink={admin.linkCoach}
        onCancel={admin.cancelRequest}
        onUnlink={admin.unlinkCoach}
      />
      <p style={{ fontSize: 12, color: palette.inkMid, margin: 0, lineHeight: 1.5 }}>
        Coach mode controls (for users who coach others) live on the &ldquo;Coach mode&rdquo; screen.
      </p>
    </div>
  );
}
