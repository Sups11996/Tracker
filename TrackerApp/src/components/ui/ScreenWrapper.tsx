import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../constants';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  /** Apply horizontal padding. Default true */
  padded?: boolean;
  /** Safe area edges to apply. Default ['top'] */
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

/**
 * Transparent safe-area wrapper with dark fallback.
 * Background depth comes from AppBackground (global gradient + orbs in App.tsx).
 */
export function ScreenWrapper({
  children,
  padded = true,
  edges = ['top'],
  style,
  ...rest
}: ScreenWrapperProps) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <View
        style={[styles.container, padded && styles.padded, style]}
        {...rest}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background, // Dark fallback instead of transparent
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  padded: {
    paddingHorizontal: 20,
  },
});
