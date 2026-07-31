import React from 'react';
import { StyleSheet, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { BarChart2, Home, Settings } from 'lucide-react-native';
import { HomeScreen } from '../features/home/HomeScreen';
import { DashboardScreen } from '../features/dashboard/DashboardScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { useAppHydration } from '../hooks/useAppHydration';
import { AppReadyProvider } from '../contexts/AppReadyContext';
import type { MainTabParamList } from '../types';
import { COLORS, GLASS, TYPOGRAPHY } from '../constants';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ICON_SIZE = 22;

/**
 * Glass tab bar background.
 * BlurView sits at full size, then a semi-transparent tint + top border layered on top.
 * This is the same pattern as Card but adapted for the nav bar.
 */
function TabBarBackground() {
  return (
    <BlurView intensity={GLASS.blurNav} tint="dark" style={StyleSheet.absoluteFill}>
      {/* Tint layer — mirrors Card's tint */}
      <View style={styles.tabBarTint} />
    </BlurView>
  );
}

export function MainTabs() {
  const { isReady } = useAppHydration();

  return (
    <AppReadyProvider isReady={isReady}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: COLORS.textPrimary,
          tabBarInactiveTintColor: COLORS.textMuted,
          tabBarBackground: () => <TabBarBackground />,
          tabBarStyle: {
            position: 'absolute',
            // Fully transparent — blur + tint layer do all the work
            backgroundColor: 'transparent',
            borderTopColor: GLASS.border,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 10,
            paddingTop: 8,
            elevation: 0,
          },
          tabBarLabelStyle: {
            fontSize: TYPOGRAPHY.size.xs,
            fontWeight: TYPOGRAPHY.weight.semibold,
            letterSpacing: 0.2,
          },
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} color={color}>
                <Home size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.6} />
              </TabIcon>
            ),
          }}
        />
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} color={color}>
                <BarChart2 size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.6} />
              </TabIcon>
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon focused={focused} color={color}>
                <Settings size={ICON_SIZE} color={color} strokeWidth={focused ? 2.2 : 1.6} />
              </TabIcon>
            ),
          }}
        />
      </Tab.Navigator>
    </AppReadyProvider>
  );
}

/**
 * Icon wrapper — adds a pill highlight behind the active icon.
 * The pill is a small glass surface itself: subtle bg + the accent of the icon colour.
 */
function TabIcon({
  children,
  focused,
  color,
}: {
  children: React.ReactNode;
  focused: boolean;
  color: string;
}) {
  if (!focused) return <View style={styles.iconWrap}>{children}</View>;

  return (
    <View
      style={[
        styles.iconWrap,
        styles.iconWrapActive,
        { backgroundColor: `${color}18`, borderColor: `${color}30` },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarTint: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(13,15,24,0.55)',
  },
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
  iconWrapActive: {
    borderWidth: 1,
  },
});
