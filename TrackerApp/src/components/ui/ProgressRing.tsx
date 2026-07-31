import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { COLORS, TYPOGRAPHY } from '../../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface ProgressRingProps {
  /** 0 to 1 (1 = 100%) — values above 1 are clamped visually */
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  /** Label shown in the center */
  centerLabel?: string;
  /** Sub-label shown below center label */
  centerSub?: string;
}

export function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  color = COLORS.steps,
  trackColor = COLORS.glass,
  centerLabel,
  centerSub,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamp visual progress to 100%
  const clampedProgress = Math.min(progress, 1);
  const animatedProgress = useSharedValue(0);

  useEffect(() => {
    animatedProgress.value = withTiming(clampedProgress, {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [clampedProgress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - animatedProgress.value),
  }));

  const cx = size / 2;
  const cy = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        {/* Track */}
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress */}
        <AnimatedCircle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          strokeLinecap="round"
          // rotate so progress starts from top
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>

      {/* Center content */}
      {(centerLabel || centerSub) && (
        <View style={styles.center}>
          {centerLabel ? (
            <Text style={[styles.centerLabel, { color }]} numberOfLines={1}>
              {centerLabel}
            </Text>
          ) : null}
          {centerSub ? (
            <Text style={styles.centerSub} numberOfLines={1}>
              {centerSub}
            </Text>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  centerSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
