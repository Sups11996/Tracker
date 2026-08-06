import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Circle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { useAbcStore } from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayData {
  date: string;
  count: number;
}

interface TimeBreakdown {
  morning: number;   // 6am-12pm
  afternoon: number; // 12pm-6pm
  evening: number;   // 6pm-12am
  night: number;     // 12am-6am
}

export function AbcDashboard() {
  const db = useSQLiteContext();
  const { todayCount } = useAbcStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [last7, setLast7] = useState<DayData[]>([]);
  const [last30, setLast30] = useState<DayData[]>([]);
  const [timeBreakdown, setTimeBreakdown] = useState<TimeBreakdown>({
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  });
  const [stats, setStats] = useState({
    weeklyAvg: 0,
    monthlyAvg: 0,
    highest: 0,
    lowest: 999,
  });

  useEffect(() => {
    loadData();
  }, [todayCount]);

  async function loadData() {
    try {
      // Last 7 days
      const seven = await db.getAllAsync<DayData>(
        'SELECT date, count FROM abc_daily_summary ORDER BY date DESC LIMIT 7'
      );
      setLast7(seven.reverse());

      // Last 30 days
      const thirty = await db.getAllAsync<DayData>(
        'SELECT date, count FROM abc_daily_summary ORDER BY date DESC LIMIT 30'
      );
      setLast30(thirty.reverse());

      // Calculate stats
      if (thirty.length > 0) {
        const counts = thirty.map(d => d.count);
        const weeklyAvg = seven.length > 0
          ? Math.round(seven.reduce((sum, d) => sum + d.count, 0) / seven.length)
          : 0;
        const monthlyAvg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
        const highest = Math.max(...counts);
        const lowest = Math.min(...counts);

        setStats({ weeklyAvg, monthlyAvg, highest, lowest });
      }

      // Time of day breakdown (today only)
      const today = new Date().toISOString().split('T')[0];
      const entries = await db.getAllAsync<{ logged_at: number }>(
        'SELECT logged_at FROM abc_logs WHERE date = ?',
        [today]
      );

      const breakdown: TimeBreakdown = { morning: 0, afternoon: 0, evening: 0, night: 0 };
      for (const entry of entries) {
        const hour = new Date(entry.logged_at).getHours();
        if (hour >= 6 && hour < 12) breakdown.morning++;
        else if (hour >= 12 && hour < 18) breakdown.afternoon++;
        else if (hour >= 18 && hour < 24) breakdown.evening++;
        else breakdown.night++;
      }
      setTimeBreakdown(breakdown);

    } catch (error) {
    }
  }

  const chartData7 = last7.map(d => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: d.count,
  }));

  const chartData30 = last30.map(d => ({
    label: new Date(d.date + 'T00:00:00').getDate().toString(),
    value: d.count,
  }));

  const maxVal7 = chartData7.length > 0 ? Math.max(...chartData7.map(d => d.value), 5) : 10;
  const maxVal30 = chartData30.length > 0 ? Math.max(...chartData30.map(d => d.value), 5) : 10;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Circle size={24} color={COLORS.abc} fill={COLORS.abc} />
        <Text style={styles.title}>ABC</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCard label="Today" value={`${todayCount}`} accentColor={COLORS.abc} />
        <StatCard label="Weekly Avg" value={`${stats.weeklyAvg}`} sub="per day" accentColor={COLORS.abc} />
        <StatCard label="Monthly Avg" value={`${stats.monthlyAvg}`} sub="per day" accentColor={COLORS.textMuted} />
        <StatCard label="Highest" value={`${stats.highest}`} sub="in 30d" accentColor={COLORS.calories} />
      </View>

      {/* 7-day chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        {chartData7.length > 0 ? (
          <BarChart
            data={chartData7}
            height={180}
            accentColor={COLORS.abc}
            maxValue={Math.ceil(maxVal7)}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* 30-day chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 30 Days</Text>
        {chartData30.length > 0 ? (
          <BarChart
            data={chartData30}
            height={180}
            accentColor={COLORS.abc}
            maxValue={Math.ceil(maxVal30)}
            compact={true}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* Time of day breakdown */}
      {todayCount > 0 && (
        <Card style={styles.timeCard}>
          <Text style={styles.chartTitle}>Today's Breakdown</Text>
          <View style={styles.timeGrid}>
            <TimeSlot label="Morning" count={timeBreakdown.morning} />
            <TimeSlot label="Afternoon" count={timeBreakdown.afternoon} />
            <TimeSlot label="Evening" count={timeBreakdown.evening} />
            <TimeSlot label="Night" count={timeBreakdown.night} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function TimeSlot({ label, count }: { label: string; count: number }) {
  return (
    <View style={styles.timeSlot}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  chartCard: { gap: SPACING.md },
  chartTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  empty: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  timeCard: { gap: SPACING.md },
  timeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  timeSlot: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  timeLabel: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  timeCount: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.abc,
  },
});
