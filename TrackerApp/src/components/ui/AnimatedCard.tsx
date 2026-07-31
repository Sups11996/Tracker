import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface AnimatedCardProps {
  children: React.ReactNode;
  index?: number; // stagger delay based on index
}

const STAGGER_MS = 80;
const DURATION_MS = 350;

export function AnimatedCard({ children, index = 0 }: AnimatedCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    const delay = index * STAGGER_MS;
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: DURATION_MS,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: DURATION_MS,
        delay,
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
