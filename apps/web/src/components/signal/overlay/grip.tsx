'use client';

import styled from '@emotion/styled';
import { signalTokens, type SignalSurfaceMode } from '@lib/signal/tokens';

type GripProps = {
  surface: SignalSurfaceMode;
  onActivate: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
};

const GripButton = styled.button<{ $surface: SignalSurfaceMode }>`
  display: block;
  width: 36px;
  height: 4px;
  border: 0;
  padding: 0;
  margin: 10px auto 0;
  border-radius: 2px;
  background: ${({ $surface }) => signalTokens.surface[$surface].border};
  cursor: grab;
  touch-action: none;
  transition: background 120ms ease;

  &:hover {
    background: ${({ $surface }) => signalTokens.surface[$surface].borderStrong};
  }

  &:active {
    cursor: grabbing;
  }

  &:focus-visible {
    outline: 2px solid ${signalTokens.signal.base};
    outline-offset: 4px;
  }
`;

export function Grip({ surface, onActivate, onPointerDown }: GripProps) {
  return (
    <GripButton
      type="button"
      $surface={surface}
      aria-label="Dismiss overlay"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          onActivate();
        }
      }}
      onPointerDown={onPointerDown}
    />
  );
}
