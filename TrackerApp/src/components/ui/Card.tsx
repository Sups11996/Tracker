import React from 'react';
import { View, type ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, className, ...rest }: CardProps) {
  return (
    <View
      className={`bg-white rounded-2xl p-5 shadow-sm ${className ?? ''}`}
      style={{ elevation: 2 }}
      {...rest}
    >
      {children}
    </View>
  );
}
