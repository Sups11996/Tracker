import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ChevronLeft } from 'lucide-react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';

interface OnboardingLayoutProps {
  children: React.ReactNode;
  /** Current step index (0-based) */
  step: number;
  /** Total number of steps */
  totalSteps: number;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  /** Hide back button on first screen */
  hideBack?: boolean;
}

export function OnboardingLayout({
  children,
  step,
  totalSteps,
  title,
  subtitle,
  onBack,
  hideBack = false,
}: OnboardingLayoutProps) {
  const progress = (step + 1) / totalSteps;
  const animatedWidth = useSharedValue(0);

  React.useEffect(() => {
    animatedWidth.value = withTiming(progress, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
  }, [progress]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${animatedWidth.value * 100}%` as any,
  }));

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, barStyle]} />
      </View>

      {/* Header row */}
      <View style={styles.header}>
        {!hideBack ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backBtn}
            hitSlop={12}
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backBtn} />
        )}
        <Text style={styles.stepLabel}>
          {step + 1} / {totalSteps}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {/* Scrollable content */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.body}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  progressTrack: {
    height: 3,
    backgroundColor: COLORS.glass,
    width: '100%',
  },
  progressFill: {
    height: 3,
    backgroundColor: COLORS.water,
    borderRadius: RADIUS.full,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.huge,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    lineHeight: 22,
  },
  body: {
    marginTop: SPACING.xxxl,
    gap: SPACING.lg,
  },
});
