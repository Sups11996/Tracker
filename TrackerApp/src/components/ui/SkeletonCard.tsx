import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants';

interface SkeletonCardProps {
  lines?: number;
  height?: number;
}

/**
 * Animated shimmer skeleton card shown while SQLite is hydrating.
 */
export function SkeletonCard({ lines = 3, height = 140 }: SkeletonCardProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.7],
  });

  return (
    <Animated.View style={[styles.card, { opacity, minHeight: height }]}>
      {/* fake title row */}
      <View style={[styles.line, { width: '40%', height: 14 }]} />
      {/* fake content lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.line,
            { width: i === lines - 1 ? '60%' : '100%', height: 12 },
          ]}
        />
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  line: {
    backgroundColor: COLORS.glassHighlight,
    borderRadius: RADIUS.sm,
  },
});
