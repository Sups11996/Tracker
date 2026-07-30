import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../stores';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function SettingsScreen() {
  const { profile } = useUserStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.subtitle}>
          {profile ? `Logged in as ${profile.username}` : 'No profile yet'}
        </Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Settings sections coming in Chunk 12.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  placeholder: {
    marginTop: SPACING.xxxl,
    padding: SPACING.xl,
    borderRadius: 16,
    backgroundColor: COLORS.glass,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignItems: 'center',
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.size.md,
    textAlign: 'center',
  },
});
