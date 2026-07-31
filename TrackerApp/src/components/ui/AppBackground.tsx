import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';

const { width: W, height: H } = Dimensions.get('screen');

/**
 * Full-screen decorative background.
 * Renders once behind everything — provides the depth that makes glass surfaces read.
 *
 * Layers (bottom → top):
 *   1. Deep gradient base (#0D0F18 → #111424)
 *   2. Ambient orb top-left (steps accent, very soft)
 *   3. Ambient orb bottom-right (sleep accent, very soft)
 *   4. Subtle radial centre glow
 */
export function AppBackground() {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Base gradient */}
      <LinearGradient
        colors={['#0D0F18', '#0F1120', '#111528', '#0D1020']}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Top-left ambient orb — steps green */}
      <View
        style={[
          styles.orb,
          {
            width: W * 0.72,
            height: W * 0.72,
            borderRadius: W * 0.36,
            backgroundColor: `${COLORS.steps}28`,
            top: -W * 0.22,
            left: -W * 0.22,
          },
        ]}
      />

      {/* Bottom-right ambient orb — sleep lavender */}
      <View
        style={[
          styles.orb,
          {
            width: W * 0.8,
            height: W * 0.8,
            borderRadius: W * 0.4,
            backgroundColor: `${COLORS.sleep}20`,
            bottom: -W * 0.28,
            right: -W * 0.28,
          },
        ]}
      />

      {/* Mid-screen subtle water hint */}
      <View
        style={[
          styles.orb,
          {
            width: W * 0.5,
            height: W * 0.5,
            borderRadius: W * 0.25,
            backgroundColor: `${COLORS.water}12`,
            top: H * 0.38,
            left: W * 0.25,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  orb: {
    position: 'absolute',
    // No blur — orbs are just very low-opacity colour blobs.
    // expo-blur on absolutely-positioned views causes layout issues on Android.
    // The softness comes from large border-radius + very low opacity.
  },
});
