import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  accentColor?: string;
  /** Full width or half width (for 2-column grid) */
  fullWidth?: boolean;
}

export function StatCard({
  label,
  value,
  sub,
  accentColor = COLORS.textSecondary,
  fullWidth = false,
}: StatCardProps) {
  return (
    <View style={[styles.card, fullWidth && styles.fullWidth]}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.value, { color: accentColor }]} numberOfLines={1}>
        {value}
      </Text>
      {sub ? (
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: SPACING.xs,
    minWidth: 0,
  },
  fullWidth: {
    flex: undefined,
    width: '100%',
  },
  label: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  sub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
});
