import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
}

export function TextInput({ label, error, hint, style, ...rest }: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? COLORS.error
    : focused
    ? COLORS.textSecondary
    : COLORS.glassBorder;

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <RNTextInput
        style={[styles.input, { borderColor }, style]}
        placeholderTextColor={COLORS.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...rest}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  input: {
    width: '100%',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.glass,
  },
  error: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.error,
  },
  hint: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
});
