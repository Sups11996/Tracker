import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  type TouchableOpacityProps,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY, MOTION } from '../../constants';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  accentColor?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  label,
  isLoading = false,
  variant = 'primary',
  accentColor = COLORS.water,
  size = 'md',
  disabled,
  style,
  onPress,
  ...rest
}: ButtonProps) {
  const scale = useSharedValue(1);
  const isDisabled = disabled || isLoading;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function handlePressIn() {
    scale.value = withSpring(0.96, MOTION.springSnappy);
  }

  function handlePressOut() {
    scale.value = withSpring(1, MOTION.springSnappy);
  }

  const containerStyle = [
    styles.base,
    sizes[size],
    variant === 'primary' && { backgroundColor: accentColor },
    variant === 'secondary' && [styles.secondary, { borderColor: accentColor }],
    variant === 'ghost' && styles.ghost,
    isDisabled && styles.disabled,
  ];

  const textColor =
    variant === 'primary' ? COLORS.white : accentColor;

  return (
    <Animated.View style={[animatedStyle, style]}>
      <TouchableOpacity
        style={containerStyle}
        disabled={isDisabled}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={label}
        {...rest}
      >
        {isLoading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <Text style={[styles.label, { color: textColor }, textSizes[size]]}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const sizes = StyleSheet.create({
  sm: { paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg },
  md: { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl },
  lg: { paddingVertical: SPACING.lg, paddingHorizontal: SPACING.xxxl },
});

const textSizes = StyleSheet.create({
  sm: { fontSize: TYPOGRAPHY.size.sm },
  md: { fontSize: TYPOGRAPHY.size.md },
  lg: { fontSize: TYPOGRAPHY.size.lg },
});

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.xl,
  },
  secondary: {
    backgroundColor: COLORS.glass,
    borderWidth: 1,
  },
  ghost: {
    backgroundColor: COLORS.transparent,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
});
