import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StepDashboard } from '../steps/StepDashboard';
import { SleepDashboard } from '../sleep/SleepDashboard';
import { WaterDashboard } from '../water/WaterDashboard';
import { CaloriesDashboard } from '../calories/CaloriesDashboard';
import { ScreenTimeDashboard } from '../screentime/ScreenTimeDashboard';
import { AbcDashboard } from '../abc/AbcDashboard';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../constants';

type Tab = 'steps' | 'sleep' | 'water' | 'calories' | 'screen' | 'abc';

const TABS: { key: Tab; label: string; color: string }[] = [
  { key: 'steps',    label: 'Steps',    color: COLORS.steps },
  { key: 'sleep',    label: 'Sleep',    color: COLORS.sleep },
  { key: 'water',    label: 'Water',    color: COLORS.water },
  { key: 'calories', label: 'Calories', color: COLORS.calories },
  { key: 'screen',   label: 'Screen',   color: COLORS.screenTime },
  { key: 'abc',      label: 'ABC',      color: COLORS.abc },
];

export function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('steps');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Tab selector */}
      <View style={styles.tabWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {TABS.map((t) => {
            const active = activeTab === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.tab,
                  active && { borderColor: t.color, backgroundColor: `${t.color}18` },
                ]}
                onPress={() => setActiveTab(t.key)}
              >
                <Text style={[styles.tabLabel, active && { color: t.color }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Dashboard content */}
      {activeTab === 'steps'    && <StepDashboard />}
      {activeTab === 'sleep'    && <SleepDashboard />}
      {activeTab === 'water'    && <WaterDashboard />}
      {activeTab === 'calories' && <CaloriesDashboard />}
      {activeTab === 'screen'   && <ScreenTimeDashboard />}
      {activeTab === 'abc'      && <AbcDashboard />}
    </SafeAreaView>
  );
}

function PlaceholderDash({ tab }: { tab: Tab }) {
  const color = TABS.find((t) => t.key === tab)?.color ?? COLORS.textMuted;
  return (
    <View style={styles.placeholder}>
      <Text style={[styles.placeholderText, { color }]}>
        {tab.charAt(0).toUpperCase() + tab.slice(1)} dashboard coming soon.
      </Text>
    </View>
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
    backgroundColor: COLORS.glass,
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textMuted,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textMuted,
  },
});
