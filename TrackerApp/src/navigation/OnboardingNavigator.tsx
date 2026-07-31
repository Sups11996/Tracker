import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen }         from '../features/onboarding/screens/WelcomeScreen';
import { GenderAgeScreen }       from '../features/onboarding/screens/GenderAgeScreen';
import { HeightWeightScreen }    from '../features/onboarding/screens/HeightWeightScreen';
import { WaterGoalScreen }       from '../features/onboarding/screens/WaterGoalScreen';
import { GymQuestionScreen }     from '../features/onboarding/screens/GymQuestionScreen';
import { AbcQuestionScreen }     from '../features/onboarding/screens/AbcQuestionScreen';
import { PermissionsScreen }     from '../features/onboarding/screens/PermissionsScreen';
import { WaterContainersScreen } from '../features/onboarding/screens/WaterContainersScreen';
import type { OnboardingStackParamList } from '../types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

export function OnboardingNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: '#12141C' },
      }}
    >
      <Stack.Screen name="Welcome"         component={WelcomeScreen} />
      <Stack.Screen name="GenderAge"       component={GenderAgeScreen} />
      <Stack.Screen name="HeightWeight"    component={HeightWeightScreen} />
      <Stack.Screen name="WaterGoal"       component={WaterGoalScreen} />
      <Stack.Screen name="GymQuestion"     component={GymQuestionScreen} />
      <Stack.Screen name="AbcQuestion"     component={AbcQuestionScreen} />
      <Stack.Screen name="Permissions"     component={PermissionsScreen} />
      <Stack.Screen name="WaterContainers" component={WaterContainersScreen} />
    </Stack.Navigator>
  );
}
