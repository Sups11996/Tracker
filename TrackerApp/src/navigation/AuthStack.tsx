import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UsernameSetupScreen } from '../features/auth/components/UsernameSetupScreen';
import type { AuthStackParamList } from '../types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="UsernameSetup" component={UsernameSetupScreen} />
    </Stack.Navigator>
  );
}
