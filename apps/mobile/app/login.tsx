import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGoogleSignIn } from '@/lib/auth/useGoogleSignIn';

export default function LoginScreen() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const { ready, signIn } = useGoogleSignIn({
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
      setPending(false);
    },
  });

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.title}>Forti</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <Pressable
          accessibilityRole="button"
          disabled={!ready || pending}
          onPress={async () => {
            setError(null);
            setPending(true);
            await signIn();
            setPending(false);
          }}
          style={({ pressed }) => [
            styles.button,
            (!ready || pending) && styles.buttonDisabled,
            pressed && styles.buttonPressed,
          ]}>
          {pending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Continue with Google</Text>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {!ready ? <Text style={styles.hint}>Loading sign-in…</Text> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0b0b0c',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    gap: 16,
  },
  title: {
    color: '#fff',
    fontSize: 36,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: '#a1a1aa',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#1f6feb',
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#f87171',
    textAlign: 'center',
  },
  hint: {
    color: '#71717a',
    textAlign: 'center',
    fontSize: 13,
  },
});
