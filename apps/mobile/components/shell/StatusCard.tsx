import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  tone?: 'default' | 'danger' | 'muted';
  value: string;
};

export function StatusCard({ label, tone = 'default', value }: Props) {
  return (
    <View style={[styles.card, tone === 'danger' ? styles.cardDanger : styles.cardMuted]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, tone === 'danger' ? styles.valueDanger : undefined]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 6,
  },
  cardMuted: {
    backgroundColor: '#121826',
    borderColor: '#273143',
  },
  cardDanger: {
    backgroundColor: '#241317',
    borderColor: '#5c2530',
  },
  label: {
    color: '#8f9bb3',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  value: {
    color: '#f5f7fb',
    fontSize: 15,
    lineHeight: 22,
  },
  valueDanger: {
    color: '#fecaca',
  },
});
