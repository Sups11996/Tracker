import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUserStore } from '../../stores';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function HomeScreen() {
  const { profile } = useUserStore();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.greeting}>
          Hey{profile ? `, ${profile.username}` : ''} 👋
        </Text>
        <Text style={styles.subtitle}>Your tracking dashboard</Text>

        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Feature cards will appear here in upcoming chunks.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  greeting: {
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
