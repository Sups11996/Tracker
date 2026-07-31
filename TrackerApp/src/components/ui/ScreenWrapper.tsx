import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenWrapperProps extends ViewProps {
  children: React.ReactNode;
  /** Apply horizontal padding. Default true */
  padded?: boolean;
  /** Safe area edges to apply. Default ['top'] */
  edges?: Array<'top' | 'bottom' | 'left' | 'right'>;
}

/**
 * Transparent safe-area wrapper.
 * Background depth comes from AppBackground (global gradient + orbs in App.tsx).
 * Never set backgroundColor here — that would paint over the gradient.
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
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  padded: {
    paddingHorizontal: 20,
  },
});
