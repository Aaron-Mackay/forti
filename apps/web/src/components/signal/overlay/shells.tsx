'use client';

import styled from '@emotion/styled';
import { signalTokens } from '@lib/signal/tokens';

const DESKTOP_BP = signalTokens.space.desktopBreakpointPx;

// ModalShell hidden on mobile; positioned and dimensioned by inline style for size/accent.
export const ModalShellRoot = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  padding: 24px;

  @media (max-width: ${DESKTOP_BP - 1}px) {
    display: none;
  }

  & > * {
    pointer-events: auto;
  }
`;

// DrawerShell hidden on desktop.
export const DrawerShellRoot = styled.div`
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: stretch;
  pointer-events: none;

  @media (min-width: ${DESKTOP_BP}px) {
    display: none;
  }

  & > * {
    pointer-events: auto;
  }
`;
