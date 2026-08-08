import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppBackground } from './src/components/ui/AppBackground';
import { AlertProvider } from './src/hooks/useCustomAlert';
import { initDatabase, DATABASE_NAME } from './src/lib';

// Set default notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function App() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      // Create default notification channel with our icon
      Notifications.setNotificationChannelAsync('default', {
        name: 'Tracker Notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#12141C',
      });
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Gradient + ambient orbs — lives behind every screen */}
        <AppBackground />
        <SQLiteProvider databaseName={DATABASE_NAME} onInit={initDatabase}>
          <NavigationContainer>
            <AlertProvider>
              <StatusBar style="light" />
              <RootNavigator />
            </AlertProvider>
          </NavigationContainer>
        </SQLiteProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
