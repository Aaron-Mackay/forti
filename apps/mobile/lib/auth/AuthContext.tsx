import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';

import { createDefaultAuthSessionController } from './createDefaultAuthSessionController';
import { type AuthState } from './sessionTypes';

type AuthContextValue = AuthState & {
  signInWithGoogleIdToken: (idToken: string) => Promise<void>;
  signOut: () => Promise<void>;
  getAccessToken: (options?: { forceRefresh?: boolean }) => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const controllerRef = useRef(createDefaultAuthSessionController());
  const [state, setState] = useState<AuthState>(controllerRef.current.getState());

  useEffect(() => {
    const controller = controllerRef.current;
    const unsubscribe = controller.subscribe(setState);
    void controller.load();

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      void controller.getAccessToken().catch(() => {
        // Leave network and server errors to the next foreground request.
      });
    });

    return () => {
      unsubscribe();
      subscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      signInWithGoogleIdToken: (idToken) => controllerRef.current.signInWithGoogleIdToken(idToken),
      signOut: () => controllerRef.current.signOut(),
      getAccessToken: (options) => controllerRef.current.getAccessToken(options),
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
