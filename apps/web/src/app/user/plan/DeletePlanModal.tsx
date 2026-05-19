'use client';

import { Overlay } from '@/components/signal/overlay';
import { signalTokens } from '@lib/signal/tokens';

export interface DeletePlanModalProps {
  open: boolean;
  plan: { id: number; name: string } | null;
  isActive: boolean;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeletePlanModal({
  open,
  plan,
  isActive,
  loading = false,
  onCancel,
  onConfirm,
}: DeletePlanModalProps) {
  const palette = signalTokens.surface.planning;

  return (
    <Overlay
      open={open}
      onClose={loading ? () => undefined : onCancel}
      title={plan ? `Delete ${plan.name}?` : 'Delete plan?'}
      eyebrow="Confirm · destructive action"
      size="sm"
      accent
      primaryAction={{
        label: loading ? 'Deleting...' : 'Delete plan',
        onClick: onConfirm,
        disabled: loading,
      }}
      secondaryAction={{
        label: 'Cancel',
        onClick: onCancel,
        disabled: loading,
      }}
    >
      <div style={{ display: 'grid', gap: 10, color: palette.inkMid, fontSize: 14, lineHeight: 1.5 }}>
        <div>All logged workouts under this plan will be lost.</div>
        {isActive && (
          <div style={{ color: signalTokens.status.urgent }}>
            This is your active plan. Deleting it will clear your active selection.
          </div>
        )}
      </div>
    </Overlay>
  );
}
