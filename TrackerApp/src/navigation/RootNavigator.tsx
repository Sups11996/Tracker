import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores';
import { MainTabs } from './MainTabs';
import { OnboardingNavigator } from './OnboardingNavigator';
import DebugScreenTimeScreen from '../features/debug/DebugScreenTimeScreen';
import type { RootStackParamList } from '../types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const db = useSQLiteContext();
  const { profile, setProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const row = await db.getFirstAsync<any>(
          'SELECT * FROM user_profile WHERE id = 1'
        );
        if (row && row.onboarding_complete === 1) {
          setProfile({
            ...row,
            uses_gym: row.uses_gym === 1,
            uses_abc: row.uses_abc === 1,
            onboarding_complete: true,
          });
        }
      } catch (e) {
        console.error('[RootNavigator] bootstrap error:', e);
      } finally {
        setIsReady(true);
      }
    }
    bootstrap();
  }, []);

  // Re-run when profile changes (i.e. onboarding just completed)
  const onboardingDone = profile?.onboarding_complete === true;

  if (!isReady) return null;

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {onboardingDone ? (
        <>
          <Root.Screen name="Main" component={MainTabs} />
          {/* Debug screen - only available in __DEV__ mode */}
          {__DEV__ && (
            <Root.Screen 
              name="DebugScreenTime" 
              component={DebugScreenTimeScreen}
              options={{
                headerShown: true,
                headerTitle: 'Screen Time Debug',
                headerStyle: { backgroundColor: '#000' },
                headerTintColor: '#fff',
                presentation: 'modal',
              }}
            />
          )}
        </>
      ) : (
        <Root.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Root.Navigator>
  );
}
