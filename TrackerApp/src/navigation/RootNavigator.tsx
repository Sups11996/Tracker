import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores';
import { MainTabs } from './MainTabs';
import { OnboardingNavigator } from './OnboardingNavigator';
import type { RootStackParamList } from '../types';

const Root = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const db = useSQLiteContext();
  const { profile, setProfile } = useUserStore();
  const [isReady, setIsReady] = useState(false);
  const [bootError, setBootError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const MAX_RETRIES = 3;

  async function bootstrap() {
    setBootError(false);
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
      console.error('[RootNavigator] Bootstrap failed:', e);
      setRetryCount(c => c + 1);
      setBootError(true);
    } finally {
      setIsReady(true);
    }
  }

  useEffect(() => {
    bootstrap();
  }, []);

  const onboardingDone = profile?.onboarding_complete === true;

  if (!isReady) return null;

  if (bootError) {
    const retriesLeft = MAX_RETRIES - retryCount;
    const outOfRetries = retryCount >= MAX_RETRIES;
    return (
      <View style={{ flex: 1, backgroundColor: '#12141C', justifyContent: 'center', alignItems: 'center', padding: 32 }}>
        <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', textAlign: 'center', marginBottom: 12 }}>
          Could not load your data
        </Text>
        <Text style={{ color: '#888', fontSize: 14, textAlign: 'center', marginBottom: 32 }}>
          {outOfRetries
            ? 'The database could not be reached after several attempts. Please force-quit the app and reopen it.'
            : `There was a problem reading the database. ${retriesLeft} attempt${retriesLeft === 1 ? '' : 's'} remaining.`}
        </Text>
        {!outOfRetries && (
          <TouchableOpacity
            onPress={bootstrap}
            style={{ backgroundColor: '#4A9EFF', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <Root.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {onboardingDone ? (
        <Root.Screen name="Main" component={MainTabs} />
      ) : (
        <Root.Screen name="Onboarding" component={OnboardingNavigator} />
      )}
    </Root.Navigator>
  );
}
