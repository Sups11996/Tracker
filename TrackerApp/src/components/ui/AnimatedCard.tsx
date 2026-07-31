import React, { useEffect, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { MOTION } from '../../constants';

interface AnimatedCardProps {
  children: React.ReactNode;
  /** Stagger delay index — each card enters MOTION.stagger ms after the previous */
  index?: number;
}

/**
 * Entrance animation wrapper for home screen cards.
 *
 * Motion spec:
 *   - Opacity 0 → 1, translateY 28 → 0
 *   - ease-out curve (things entering)
 *   - Stagger: MOTION.stagger ms per index
 *   - Respects system reduced-motion: snaps immediately if enabled
 *   - Animates transform/opacity only — never layout — stays 60 fps
 */
export function AnimatedCard({ children, index = 0 }: AnimatedCardProps) {
  const reducedMotion = useReducedMotion();
  const opacity    = useRef(new Animated.Value(reducedMotion ? 1 : 0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 28)).current;

  useEffect(() => {
    if (reducedMotion) return; // already visible — nothing to animate

    const delay = index * MOTION.stagger;

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: MOTION.standard,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: MOTION.standard,
        delay,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
}
