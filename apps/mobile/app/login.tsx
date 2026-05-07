import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';

import { useGoogleSignIn } from '@/lib/auth/useGoogleSignIn';
import { PlaceholderScaffold } from '@/components/shell/PlaceholderScaffold';
import { getSignedOutReasonMessage } from '@/lib/auth/sessionTypes';
import { useAuth } from '@/lib/auth/AuthContext';

export default function LoginScreen() {
  const auth = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { ready, signIn } = useGoogleSignIn({
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setPending(false);
    },
  });
  const signedOutMessage = auth.status === 'signed-out' ? getSignedOutReasonMessage(auth.reason) : null;

  return (
    <PlaceholderScaffold
      actions={[
        {
          disabled: !ready || pending,
          label: 'Continue with Google',
          onPress: async () => {
            if (!ready || pending) return;
            setError(null);
            setPending(true);
            await signIn();
            setPending(false);
          },
        },
      ]}
      isBusy={pending}
      title="Forti sign-in"
      subtitle="This pre-restyle login route validates the native Google flow and mobile bearer-session exchange."
      status={pending ? <ActivityIndicator color="#f5f7fb" /> : null}
    >
      {signedOutMessage ? <Text style={styles.info}>{signedOutMessage}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!ready ? <Text style={styles.hint}>Preparing the sign-in flow…</Text> : null}
    </PlaceholderScaffold>
  );
}

const styles = StyleSheet.create({
  error: {
    color: '#fecaca',
    lineHeight: 20,
  },
  hint: {
    color: '#8f9bb3',
    fontSize: 13,
  },
  info: {
    color: '#d2d9e6',
    lineHeight: 20,
  },
});
