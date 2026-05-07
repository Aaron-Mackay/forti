import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef } from 'react';

import { useAuth } from './AuthContext';

WebBrowser.maybeCompleteAuthSession();

type UseGoogleSignInOptions = {
  onError?: (error: unknown) => void;
};

type UseGoogleSignInResult = {
  ready: boolean;
  signIn: () => Promise<void>;
};

/**
 * Drives the Google ID-token flow with `expo-auth-session` and exchanges the
 * resulting id_token for Forti mobile JWTs via the AuthContext.
 *
 * Provide Google OAuth client IDs via env (or app.json `extra`):
 *   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
 *   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
 */
export function useGoogleSignIn(options: UseGoogleSignInOptions = {}): UseGoogleSignInResult {
  const { signInWithGoogleIdToken } = useAuth();
  const onErrorRef = useRef(options.onError);
  onErrorRef.current = options.onError;

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!response) return;
    if (response.type !== 'success') return;
    const idToken = response.params?.id_token;
    if (!idToken) return;
    void (async () => {
      try {
        await signInWithGoogleIdToken(idToken);
      } catch (err) {
        onErrorRef.current?.(err);
      }
    })();
  }, [response, signInWithGoogleIdToken]);

  const signIn = useCallback(async () => {
    try {
      const result = await promptAsync();
      if (result.type !== 'success') {
        // user cancelled or dismissed; not an error worth surfacing
        return;
      }
    } catch (err) {
      onErrorRef.current?.(err);
    }
  }, [promptAsync]);

  return { ready: Boolean(request), signIn };
}
