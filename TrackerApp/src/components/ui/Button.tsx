import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  label: string;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function Button({
  label,
  isLoading = false,
  variant = 'primary',
  disabled,
  className,
  ...rest
}: ButtonProps) {
  const base = 'flex-row items-center justify-center rounded-2xl py-4 px-6';

  const variants: Record<string, string> = {
    primary:   'bg-primary-500',
    secondary: 'bg-primary-50 border border-primary-500',
    ghost:     'bg-transparent',
  };

  const textVariants: Record<string, string> = {
    primary:   'text-white font-semibold text-base',
    secondary: 'text-primary-600 font-semibold text-base',
    ghost:     'text-primary-600 font-semibold text-base',
  };

  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      className={`${base} ${variants[variant]} ${isDisabled ? 'opacity-50' : ''} ${className ?? ''}`}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator color={variant === 'primary' ? '#fff' : '#3B82F6'} />
      ) : (
        <Text className={textVariants[variant]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
