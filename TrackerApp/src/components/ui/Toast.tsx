import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface ToastProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  /** Duration in ms before auto-dismiss. Default 4000 */
  duration?: number;
  visible: boolean;
}

export function Toast({
  message,
  actionLabel = 'Undo',
  onAction,
  onDismiss,
  duration = 4000,
  visible,
}: ToastProps) {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function dismiss() {
    translateY.value = withSpring(100, { damping: 18, stiffness: 200 });
    opacity.value = withTiming(0, { duration: 200 }, (finished) => {
      if (finished && onDismiss) runOnJS(onDismiss)();
    });
  }

  useEffect(() => {
    if (visible) {
      // Slide up
      translateY.value = withSpring(0, { damping: 18, stiffness: 200 });
      opacity.value = withTiming(1, { duration: 200 });

      // Auto dismiss
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        dismiss();
      }, duration);
    } else {
      dismiss();
    }

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  function handleAction() {
    if (timer.current) clearTimeout(timer.current);
    dismiss();
    onAction?.();
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]} pointerEvents="box-none">
      <View style={styles.toast}>
        <Text style={styles.message} numberOfLines={1}>
          {message}
        </Text>
        {onAction && (
          <TouchableOpacity onPress={handleAction} hitSlop={12}>
            <Text style={styles.action}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90,
    left: SPACING.xl,
    right: SPACING.xl,
    zIndex: 999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceHigh,
    borderRadius: RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    gap: SPACING.md,
  },
  message: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.medium,
  },
  action: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.water,
  },
});
