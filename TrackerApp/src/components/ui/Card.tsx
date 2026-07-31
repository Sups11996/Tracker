import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { COLORS, RADIUS, SPACING } from '../../constants';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /** Use blur overlay — looks best on top of background images or gradients */
  blur?: boolean;
  /** Extra padding override */
  padding?: number;
}

export function Card({ children, blur = false, padding, style, ...rest }: CardProps) {
  const inner = (
    <View style={[styles.inner, padding !== undefined && { padding }, style]} {...rest}>
      {children}
    </View>
  );

  if (blur) {
    return (
      <BlurView intensity={18} tint="dark" style={[styles.card, style]}>
        {inner}
      </BlurView>
    );
  }

  return <View style={[styles.card, style]} {...rest}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
});
