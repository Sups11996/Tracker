import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores';
import { MainTabs } from './MainTabs';
import type { RootStackParamList } from '../types';

// Placeholder — will be replaced in Chunk 3
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants';

function OnboardingPlaceholder() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Onboarding — Coming in Chunk 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  text: { color: COLORS.textSecondary, fontSize: 16 },
});

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const db = useSQLiteContext();
  const { setProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        // Load profile from SQLite
        const profile = await db.getFirstAsync<{ onboarding_complete: number }>(
          'SELECT * FROM user_profile WHERE id = 1'
        );
        if (profile && profile.onboarding_complete === 1) {
          setProfile(profile as any);
          setOnboardingDone(true);
        }
      } catch (e) {
        console.error('[RootNavigator] bootstrap error:', e);
      } finally {
        setIsReady(true);
      }
    }
    bootstrap();
  }, []);

  if (!isReady) return null;

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {onboardingDone ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Onboarding" component={OnboardingPlaceholder} />
      )}
    </Root.Navigator>
  );
}
