import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Action = {
  disabled?: boolean;
  label: string;
  onPress: () => void | Promise<void>;
};

type Props = PropsWithChildren<{
  actions?: Action[];
  caption?: string;
  isBusy?: boolean;
  title: string;
  subtitle: string;
  status?: ReactNode;
}>;

export function PlaceholderScaffold({
  actions = [],
  caption,
  children,
  isBusy = false,
  status,
  subtitle,
  title,
}: Props) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          {status ? <View style={styles.status}>{status}</View> : null}
        </View>

        {actions.length > 0 ? (
          <View style={styles.actions}>
            {actions.map((action) => (
              <Pressable
                accessibilityRole="button"
                key={action.label}
                disabled={action.disabled || isBusy}
                onPress={action.onPress}
                style={({ pressed }) => [
                  styles.action,
                  pressed && styles.actionPressed,
                  (action.disabled || isBusy) && styles.actionDisabled,
                ]}
              >
                {isBusy ? <ActivityIndicator color="#f5f7fb" /> : <Text style={styles.actionLabel}>{action.label}</Text>}
              </Pressable>
            ))}
          </View>
        ) : null}

        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0b0f19',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 24,
  },
  hero: {
    gap: 10,
  },
  title: {
    color: '#f5f7fb',
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    color: '#d2d9e6',
    fontSize: 16,
    lineHeight: 22,
  },
  caption: {
    color: '#8f9bb3',
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    marginTop: 6,
  },
  actions: {
    gap: 12,
  },
  action: {
    alignItems: 'center',
    backgroundColor: '#1d4ed8',
    borderRadius: 12,
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  actionPressed: {
    opacity: 0.85,
  },
  actionDisabled: {
    opacity: 0.65,
  },
  actionLabel: {
    color: '#f5f7fb',
    fontSize: 15,
    fontWeight: '600',
  },
  body: {
    gap: 12,
  },
});
