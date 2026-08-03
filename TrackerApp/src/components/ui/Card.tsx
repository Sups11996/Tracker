import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { BlurView } from 'expo-blur';
import { GLASS, SPACING, COLORS } from '../../constants';

interface CardProps extends ViewProps {
  children: React.ReactNode;
  /**
   * Accent colour for the subtle top-edge highlight line.
   * Pass a feature colour (COLORS.steps etc.) to tint the card edge.
   * Omit for the default neutral glass border.
   */
  accentColor?: string;
  /** Override inner padding */
  padding?: number;
  /** Disable blur (use on very long lists where BlurView count matters) */
  noBlur?: boolean;
}

/**
 * Glass card — the primary surface component.
 *
 * Structure:
 *   BlurView (backdrop blur)
 *   └── semi-transparent white tint layer  ← sells the "frosted glass" look
 *       └── optional 1px accent top border  ← adds depth / feature identity
 *           └── content
 *
 * Keep glass deliberate: use Card for the main content containers,
 * not for every single row item inside them.
 */
export function Card({
  children,
  accentColor,
  padding,
  noBlur = false,
  style,
  ...rest
}: CardProps) {
  const inner = (
    <View
      style={[
        styles.tint,
        accentColor && { borderTopColor: `${accentColor}55`, borderTopWidth: 1.5 },
        padding !== undefined && { padding },
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );

  if (noBlur) {
    return (
      <View style={[styles.shell, styles.noBlurShell]}>
        {inner}
      </View>
    );
  }

  return (
    <BlurView
      intensity={GLASS.blurCard}
      tint="dark"
      style={[styles.shell, { backgroundColor: COLORS.background }]} // Match app background
    >
      {inner}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  /** Outer container — clips blur to rounded corners */
  shell: {
    borderRadius: GLASS.radius,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: GLASS.border,
    // Soft drop shadow
    ...GLASS.shadow,
  },
  /** Fallback shell when noBlur=true */
  noBlurShell: {
    backgroundColor: COLORS.background, // Match app background
  },
  /** Semi-transparent white tint on top of the blur */
  tint: {
    backgroundColor: 'transparent', // Removed white tint overlay
    padding: SPACING.xl,
    // No border here — border lives on the shell (BlurView)
    overflow: 'hidden',
  },
});
