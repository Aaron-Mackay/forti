'use client';

import styled from '@emotion/styled';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';

export type OverlayAction = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
};

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'modal' | 'drawer';

type ButtonStyleProps = {
  $variant: Variant;
  $size: Size;
  $surface: SignalSurfaceMode;
};

const ActionButton = styled.button<ButtonStyleProps>`
  font-family: ${signalTokens.fontVar.body};
  font-weight: 500;
  letter-spacing: 0;
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 18px;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
  white-space: nowrap;

  font-size: ${({ $size }) => ($size === 'drawer' ? 15 : 13)}px;
  height: ${({ $size }) => ($size === 'drawer' ? 50 : 36)}px;
  width: ${({ $size }) => ($size === 'drawer' ? '100%' : 'auto')};

  background: ${({ $variant }) => {
    if ($variant === 'primary') return signalTokens.signal.base;
    return 'transparent';
  }};

  color: ${({ $variant, $surface }) => {
    if ($variant === 'primary') return signalTokens.surface.gym.bg;
    if ($variant === 'ghost') return signalTokens.surface[$surface].inkMid;
    return signalTokens.surface[$surface].ink;
  }};

  border: ${({ $variant, $surface }) => {
    if ($variant === 'secondary') {
      return `1px solid ${signalTokens.surface[$surface].borderStrong}`;
    }
    return 'none';
  }};

  &:hover:not(:disabled) {
    filter: ${({ $variant }) => ($variant === 'primary' ? 'brightness(0.96)' : 'none')};
    background: ${({ $variant, $surface }) => {
      if ($variant === 'primary') return signalTokens.signal.base;
      if ($variant === 'ghost') return signalTokens.signal.dim;
      return signalTokens.surface[$surface].surfaceAlt;
    }};
  }

  &:focus-visible {
    outline: 2px solid ${signalTokens.signal.base};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

type ActionsBlockProps = {
  surface: SignalSurfaceMode;
  variant: 'modal' | 'drawer';
  primary?: OverlayAction;
  secondary?: OverlayAction;
  ghost?: OverlayAction;
};

export function ActionsBlock({ surface, variant, primary, secondary, ghost }: ActionsBlockProps) {
  if (!primary && !secondary && !ghost) return null;

  if (variant === 'modal') {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          width: '100%',
        }}
      >
        <div>
          {ghost && (
            <ActionButton
              type="button"
              $variant="ghost"
              $size="modal"
              $surface={surface}
              onClick={ghost.onClick}
            >
              {ghost.label}
            </ActionButton>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {secondary && (
            <ActionButton
              type="button"
              $variant="secondary"
              $size="modal"
              $surface={surface}
              onClick={secondary.onClick}
              disabled={secondary.disabled}
            >
              {secondary.label}
            </ActionButton>
          )}
          {primary && (
            <ActionButton
              type="button"
              $variant="primary"
              $size="modal"
              $surface={surface}
              onClick={primary.onClick}
              disabled={primary.disabled}
            >
              {primary.label}
            </ActionButton>
          )}
        </div>
      </div>
    );
  }

  // drawer: stacked, primary on top, secondary, ghost
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        alignItems: 'stretch',
      }}
    >
      {primary && (
        <ActionButton
          type="button"
          $variant="primary"
          $size="drawer"
          $surface={surface}
          onClick={primary.onClick}
          disabled={primary.disabled}
        >
          {primary.label}
        </ActionButton>
      )}
      {secondary && (
        <ActionButton
          type="button"
          $variant="secondary"
          $size="drawer"
          $surface={surface}
          onClick={secondary.onClick}
          disabled={secondary.disabled}
        >
          {secondary.label}
        </ActionButton>
      )}
      {ghost && (
        <ActionButton
          type="button"
          $variant="ghost"
          $size="drawer"
          $surface={surface}
          onClick={ghost.onClick}
        >
          {ghost.label}
        </ActionButton>
      )}
    </div>
  );
}

export const CloseButton = styled.button<{ $surface: SignalSurfaceMode }>`
  width: 28px;
  height: 28px;
  background: transparent;
  border: 1px solid ${({ $surface }) => signalTokens.surface[$surface].border};
  border-radius: 3px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: ${({ $surface }) => signalTokens.surface[$surface].inkMid};
  transition: background 120ms ease, border-color 120ms ease, color 120ms ease;
  flex-shrink: 0;

  &:hover {
    background: ${({ $surface }) => signalTokens.surface[$surface].surfaceAlt};
    color: ${({ $surface }) => signalTokens.surface[$surface].ink};
  }

  &:focus-visible {
    outline: 2px solid ${signalTokens.signal.base};
    outline-offset: 2px;
  }
`;
