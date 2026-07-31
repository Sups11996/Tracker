import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { BarChart2, Home, Settings } from 'lucide-react-native';
import { HomeScreen } from '../features/home/HomeScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import type { MainTabParamList } from '../types';
import { COLORS, TYPOGRAPHY } from '../constants';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 22;

/** Glassy tab bar background rendered via BlurView */
function TabBarBackground() {
  return (
    <BlurView
      intensity={40}
      tint="dark"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.textPrimary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'rgba(18,20,28,0.75)',
          borderTopColor: COLORS.glassBorder,
          borderTopWidth: 1,
          height: 62,
          paddingBottom: 10,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: TYPOGRAPHY.size.xs,
          fontWeight: TYPOGRAPHY.weight.semibold,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Home size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: 'Dashboard',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <BarChart2 size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </View>
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIcon : undefined}>
              <Settings size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            </View>
          ),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeIcon: {
    // subtle glow dot under active icon — purely decorative
    shadowColor: COLORS.textPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
});
