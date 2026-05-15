'use client';

import { createContext, useContext } from 'react';
import type { SignalSurfaceMode } from '@lib/signal/tokens';

const SignalSurfaceContext = createContext<SignalSurfaceMode>('planning');

export const SignalSurfaceProvider = SignalSurfaceContext.Provider;

export function useSignalSurface(): SignalSurfaceMode {
  return useContext(SignalSurfaceContext);
}
