/**
 * Animated circular progress component with smooth transitions
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { COLORS, MOTION } from '../../constants';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedProgressProps {
  /**
   * Progress percentage (0-100)
   */
  progress: number;
  
  /**
   * Size of the circle in pixels
   */
  size?: number;
  
  /**
   * Stroke width
   */
  strokeWidth?: number;
  
  /**
   * Color when at 0% progress
   */
  startColor?: string;
  
  /**
   * Color when at 50% progress
   */
  midColor?: string;
  
  /**
   * Color when at 100% progress
   */
  endColor?: string;
  
  /**
   * Background track color
   */
  trackColor?: string;
  
  /**
   * Animation duration in ms
   */
  duration?: number;
  
  /**
   * Use spring animation instead of timing
   */
  useSpring?: boolean;
}

export function AnimatedProgress({
  progress,
  size = 120,
  strokeWidth = 8,
  startColor = COLORS.error,
  midColor = COLORS.warning,
  endColor = COLORS.success,
  trackColor = COLORS.glass,
  duration = MOTION.standard,
  useSpring = false,
}: AnimatedProgressProps) {
  const animatedProgress = useSharedValue(0);
  
  // Calculate circle dimensions
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animate progress when it changes
  useEffect(() => {
    if (useSpring) {
      animatedProgress.value = withSpring(progress, MOTION.springSnappy);
    } else {
      animatedProgress.value = withTiming(progress, { duration });
    }
  }, [progress, useSpring, duration]);

  // Animated props for the progress circle
  const animatedProps = useAnimatedProps(() => {
    const progressValue = animatedProgress.value;
    const strokeDashoffset = circumference - (circumference * progressValue) / 100;
    
    // Interpolate color based on progress
    const color = interpolateColor(
      progressValue,
      [0, 50, 100],
      [startColor, midColor, endColor]
    );

    return {
      strokeDashoffset,
      stroke: color,
    };
  });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Animated progress */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeLinecap="round"
          animatedProps={animatedProps}
          rotation="-90"
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
