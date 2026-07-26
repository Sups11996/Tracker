import React from 'react';
import {
  Text,
  TextInput as RNTextInput,
  View,
  type TextInputProps,
} from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

export function TextInput({ label, error, className, ...rest }: InputProps) {
  return (
    <View className="gap-y-1">
      {label ? (
        <Text className="text-sm font-medium text-slate-700">{label}</Text>
      ) : null}

      <RNTextInput
        className={`w-full rounded-xl border px-4 py-3 text-base text-slate-900 bg-white
          ${error ? 'border-red-400' : 'border-slate-200'}
          ${className ?? ''}`}
        placeholderTextColor="#94A3B8"
        autoCapitalize="none"
        autoCorrect={false}
        {...rest}
      />

      {error ? (
        <Text className="text-xs text-red-500">{error}</Text>
      ) : null}
    </View>
  );
}
