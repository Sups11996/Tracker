import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Moon } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { useSleepStore } from '../../stores/sleepStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface SleepSession {
  date: string;
  actual_duration: number;
  goal_mins: number;
  goal_met: number;
}

export function SleepDashboard() {
  const db = useSQLiteContext();
  const { goalMinutes } = useSleepStore();
  
  const [last7Days, setLast7Days] = useState<SleepSession[]>([]);
  const [last30Days, setLast30Days] = useState<SleepSession[]>([]);
  const [stats, setStats] = useState({
    avgSleep: 0,
    bestSleep: 0,
    consistency: 0,
    goalMetCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Last 7 days
      const seven = await db.getAllAsync<SleepSession>(
        `SELECT date, actual_duration, goal_mins, goal_met 
         FROM sleep_sessions 
         WHERE is_active = 0 AND actual_duration IS NOT NULL
         ORDER BY date DESC 
         LIMIT 7`
      );
      setLast7Days(seven.reverse());

      // Last 30 days
      const thirty = await db.getAllAsync<SleepSession>(
        `SELECT date, actual_duration, goal_mins, goal_met 
         FROM sleep_sessions 
         WHERE is_active = 0 AND actual_duration IS NOT NULL
         ORDER BY date DESC 
         LIMIT 30`
      );
      setLast30Days(thirty.reverse());

      // Calculate stats
      if (thirty.length > 0) {
        const durations = thirty.map(s => s.actual_duration);
        const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
        const best = Math.max(...durations);
        const goalMet = thirty.filter(s => s.goal_met === 1).length;
        
        // Consistency: standard deviation (lower is better, normalize to 0-100)
        const variance = durations.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);
        const consistency = Math.max(0, 100 - (stdDev / avg) * 100);

        setStats({
          avgSleep: Math.round(avg),
          bestSleep: Math.round(best),
          consistency: Math.round(consistency),
          goalMetCount: goalMet,
        });
      }
    } catch (error) {
      console.error('Failed to load sleep dashboard data:', error);
    }
  }

  const chartData7 = last7Days.map(s => ({
    label: new Date(s.date).toLocaleDateString('en-US', { weekday: 'short' }),
    value: s.actual_duration / 60, // Convert to hours
  }));

  const chartData30 = last30Days.map(s => ({
    label: new Date(s.date).getDate().toString(),
    value: s.actual_duration / 60,
  }));

  const qualityGoodCount = last30Days.filter(s => 
    (s.actual_duration / s.goal_mins) >= 0.9
  ).length;
  const qualityFairCount = last30Days.filter(s => {
    const pct = s.actual_duration / s.goal_mins;
    return pct >= 0.7 && pct < 0.9;
  }).length;
  const qualityPoorCount = last30Days.length - qualityGoodCount - qualityFairCount;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Moon size={24} color={COLORS.sleep} />
        <Text style={styles.title}>Sleep Tracking</Text>
      </View>

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Avg Sleep"
          value={formatDuration(stats.avgSleep)}
          accentColor={COLORS.sleep}
        />
        <StatCard
          label="Best Night"
          value={formatDuration(stats.bestSleep)}
          accentColor={COLORS.success}
        />
        <StatCard
          label="Consistency"
          value={`${stats.consistency}%`}
          accentColor={COLORS.water}
        />
        <StatCard
          label="Goal Met"
          value={`${stats.goalMetCount}/${last30Days.length}`}
          accentColor={COLORS.sleep}
        />
      </View>

      {/* 7-Day Chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        {chartData7.length > 0 ? (
          <BarChart
            data={chartData7}
            height={180}
            accentColor={COLORS.sleep}
            maxValue={Math.ceil(goalMinutes / 60) + 1}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* 30-Day Chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 30 Days</Text>
        {chartData30.length > 0 ? (
          <BarChart
            data={chartData30}
            height={180}
            accentColor={COLORS.sleep}
            maxValue={Math.ceil(goalMinutes / 60) + 1}
            compact={true}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* Quality Breakdown */}
      {last30Days.length > 0 && (
        <Card style={styles.qualityCard}>
          <Text style={styles.chartTitle}>Sleep Quality (Last 30 Days)</Text>
          <View style={styles.qualityRow}>
            <QualityBadge label="Great" count={qualityGoodCount} color={COLORS.success} />
            <QualityBadge label="Fair" count={qualityFairCount} color={COLORS.water} />
            <QualityBadge label="Poor" count={qualityPoorCount} color={COLORS.calories} />
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

function QualityBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={styles.qualityBadge}>
      <View style={[styles.qualityDot, { backgroundColor: color }]} />
      <Text style={styles.qualityLabel}>{label}</Text>
      <Text style={[styles.qualityCount, { color }]}>{count}</Text>
    </View>
  );
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    padding: SPACING.lg,
    gap: SPACING.lg,
    paddingBottom: SPACING.huge,
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  chartCard: {
    gap: SPACING.md,
  },
  chartTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  emptyChart: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  qualityCard: {
    gap: SPACING.md,
  },
  qualityRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  qualityBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.md,
    borderRadius: 12,
    backgroundColor: COLORS.glassHighlight,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  qualityLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  qualityCount: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
});
