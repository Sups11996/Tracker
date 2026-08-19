import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, DeviceEventEmitter } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BarChart2, Home, Settings } from 'lucide-react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
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
 * Solid tab bar background - matches home page background
 */
function TabBarBackground() {
  return (
    <View style={styles.tabBarBackground} />
  );
}

/**
 * Custom tab bar with instant color switching on tap
 */
function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  // Local state for instant visual feedback on press
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);

  // Clear pressed state when navigation state actually changes
  useEffect(() => {
    setPressedIndex(null);
  }, [state.index]);

  return (
    <View style={styles.tabBarContainer}>
      <TabBarBackground />
      <View style={styles.tabBarContent}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;
          
          // Show active ONLY if pressed (instant) or focused (after nav completes)
          // NOT both at once - this ensures previous tab turns gray instantly
          const isActive = pressedIndex !== null 
            ? pressedIndex === index  // During press, only pressed tab is active
            : isFocused;               // After press, only focused tab is active

          const onPressIn = () => {
            setPressedIndex(index);
          };

          const onPressOut = () => {
            // If finger lifts without triggering onPress (e.g. swipe away),
            // clear the highlight so the wrong tab doesn't stay active-coloured
            // Use a tiny delay so onPress (which fires after onPressOut) can
            // still clear it itself — avoids a flicker on normal taps
            setTimeout(() => {
              setPressedIndex(prev => prev === index ? null : prev);
            }, 50);
          };

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            // Save step data when switching TO Dashboard from any tab
            if (route.name === 'Dashboard' && !isFocused) {
              DeviceEventEmitter.emit('SAVE_STEPS_NOW');
            }

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
            
            // Clear pressed state after navigation
            setPressedIndex(null);
          };

          // Get icon and label
          let icon = null;
          let label = route.name;
          
          if (route.name === 'Home') {
            icon = <Home size={ICON_SIZE} color={isActive ? COLORS.white : COLORS.textMuted} strokeWidth={isActive ? 2.2 : 1.6} />;
            label = 'Home';
          } else if (route.name === 'Dashboard') {
            icon = <BarChart2 size={ICON_SIZE} color={isActive ? COLORS.white : COLORS.textMuted} strokeWidth={isActive ? 2.2 : 1.6} />;
            label = 'Dashboard';
          } else if (route.name === 'Settings') {
            icon = <Settings size={ICON_SIZE} color={isActive ? COLORS.white : COLORS.textMuted} strokeWidth={isActive ? 2.2 : 1.6} />;
            label = 'Settings';
          }

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              onPress={onPress}
              style={styles.tabButton}
              activeOpacity={1}
              delayPressIn={0}
            >
              <View style={styles.iconWrap}>{icon}</View>
              <Text style={[
                styles.tabLabel,
                { color: isActive ? COLORS.white : COLORS.textMuted }
              ]}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  const { isReady } = useAppHydration();

  return (
    <AppReadyProvider isReady={isReady}>
      <Tab.Navigator
        tabBar={props => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          lazy: true,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Dashboard" component={DashboardScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
    </AppReadyProvider>
  );
}

/**
 * Icon wrapper — simplified, no background needed
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
  return <View style={styles.iconWrap}>{children}</View>;
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    borderTopWidth: 1,
    borderTopColor: GLASS.border,
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.background,
  },
  tabBarContent: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: 16,
    paddingTop: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    letterSpacing: 0.2,
  },
  iconWrap: {
    width: 40,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
  },
});
