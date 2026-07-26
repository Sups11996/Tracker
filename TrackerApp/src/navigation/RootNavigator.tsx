import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore, useUserStore } from '../stores';
import { AuthStack } from './AuthStack';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from '../types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { session, isInitialized, initialize } = useAuthStore();
  const { profile, fetchProfile } = useUserStore();

  // Boot: restore session from SecureStore
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Once we have a session, load the profile
  useEffect(() => {
    if (session?.user.id) {
      fetchProfile(session.user.id);
    }
  }, [session, fetchProfile]);

  if (!isInitialized) {
    // Returning null keeps the splash screen visible on Expo
    return null;
  }

  // Decision logic:
  // • No session               → Auth (sign-in / anonymous onboarding)
  // • Session but no profile   → Auth (username setup)
  // • Session + profile        → Main app
  const isAuthenticated = !!session;
  const hasProfile = !!profile;
  const showMain = isAuthenticated && hasProfile;

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {showMain ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Auth" component={AuthStack} />
      )}
    </Root.Navigator>
  );
}
