import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useIsFocused, type RouteProp } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { StepDashboard } from '../steps/StepDashboard';
import { SleepDashboard } from '../sleep/SleepDashboard';
import { WaterDashboard } from '../water/WaterDashboard';
import { CaloriesDashboard } from '../calories/CaloriesDashboard';
import { AbcDashboard } from '../abc/AbcDashboard';
import { useUserStore } from '../../stores';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';
import type { MainTabParamList, DashboardTab } from '../../types/navigation';

type Tab = DashboardTab;

const ALL_TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'steps',    label: 'Steps',    color: COLORS.steps },
  { key: 'sleep',    label: 'Sleep',    color: COLORS.sleep },
  { key: 'water',    label: 'Water',    color: COLORS.water },
  { key: 'calories', label: 'Calories', color: COLORS.calories },
  { key: 'abc',      label: 'ABC',      color: COLORS.abc },
];

export function DashboardScreen() {
  const route = useRoute<RouteProp<MainTabParamList, 'Dashboard'>>();
  const isFocused = useIsFocused();
  const { profile } = useUserStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [activeTab, setActiveTab] = useState<Tab>(route.params?.tab ?? 'steps');

  // When navigated to with a specific tab param, switch to it
  useEffect(() => {
    if (isFocused && route.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [isFocused, route.params?.tab]);

  // Hide ABC tab if not enabled, hide Calories if gym off
  const visibleTabs = ALL_TABS.filter(t => {
    if (t.key === 'abc' && !profile?.uses_abc) return false;
    return true;
  });

  const activeColor = ALL_TABS.find(t => t.key === activeTab)?.color ?? COLORS.textMuted;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Tab selector */}
      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {visibleTabs.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  active && { borderColor: t.color, backgroundColor: `${t.color}18` },
                ]}
                onPress={() => setActiveTab(t.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.tabLabel, active && { color: t.color, fontWeight: TYPOGRAPHY.weight.semibold }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Active indicator bar */}
      <View style={[styles.activeBar, { backgroundColor: activeColor }]} />

      {/* Dashboard content */}
      {activeTab === 'steps'    && <StepDashboard />}
      {activeTab === 'sleep'    && <SleepDashboard />}
      {activeTab === 'water'    && <WaterDashboard />}
      {activeTab === 'calories' && <CaloriesDashboard />}
      {activeTab === 'abc'      && <AbcDashboard />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  tabWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  tabs: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: 'transparent', // Transparent background
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
  },
  activeBar: {
    height: 2,
    opacity: 0.6,
  },
});
