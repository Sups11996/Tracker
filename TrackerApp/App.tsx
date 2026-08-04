import './global.css';

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SQLiteProvider } from 'expo-sqlite';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AppBackground } from './src/components/ui/AppBackground';
import { AlertProvider } from './src/hooks/useCustomAlert';
import { initDatabase, DATABASE_NAME } from './src/lib';

export default function App() {
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
