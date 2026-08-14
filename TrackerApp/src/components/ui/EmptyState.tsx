/**
 * Empty state component for when there's no data to display
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface EmptyStateProps {
  /**
   * Icon component from lucide-react-native
   */
  icon?: LucideIcon;
  
  /**
   * Main message
   */
  title: string;
  
  /**
   * Optional description
   */
  description?: string;
  
  /**
   * Icon color
   */
  iconColor?: string;
  
  /**
   * Custom action component (e.g., a button)
   */
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  iconColor = COLORS.textMuted,
  action,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {Icon && (
        <View style={styles.iconContainer}>
          <Icon size={48} color={iconColor} strokeWidth={1.5} />
        </View>
      )}
      
      <Text style={styles.title}>{title}</Text>
      
      {description && (
        <Text style={styles.description}>{description}</Text>
      )}
      
      {action && (
        <View style={styles.actionContainer}>
          {action}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
    gap: SPACING.md,
  },
  iconContainer: {
    marginBottom: SPACING.sm,
    opacity: 0.6,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.size.sm * 1.5,
    maxWidth: 280,
  },
  actionContainer: {
    marginTop: SPACING.md,
  },
});
