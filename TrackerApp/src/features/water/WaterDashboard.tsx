import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Droplets } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { useWaterStore } from '../../stores/waterStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

interface DayData {
  date: string;
  total_ml: number;
  goal_ml: number;
}

export function WaterDashboard() {
  const db = useSQLiteContext();
  const { dailyGoal } = useWaterStore();

  const [last7, setLast7] = useState<DayData[]>([]);
  const [stats, setStats] = useState({
    avgMl: 0,
    bestMl: 0,
    streak: 0,
    goalMetCount: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Build last 7 days from water_logs (sum per date)
      const rows = await db.getAllAsync<{ date: string; total_ml: number }>(
        `SELECT date, SUM(capacity_ml) as total_ml
         FROM water_logs
         GROUP BY date
         ORDER BY date DESC
         LIMIT 7`
      );

      const seven = rows.reverse();
      setLast7(seven.map(r => ({ ...r, goal_ml: dailyGoal })));

      if (seven.length > 0) {
        const totals = seven.map(r => r.total_ml);
        const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
        const best = Math.max(...totals);
        const goalMet = seven.filter(r => r.total_ml >= dailyGoal).length;

        // Streak — count consecutive days from today going back where goal was met
        const today = new Date().toISOString().split('T')[0];
        let streak = 0;
        const allDays = await db.getAllAsync<{ date: string; total_ml: number }>(
          `SELECT date, SUM(capacity_ml) as total_ml
           FROM water_logs
           GROUP BY date
           ORDER BY date DESC
           LIMIT 30`
        );

        for (let i = 0; i < allDays.length; i++) {
          const expected = new Date();
          expected.setDate(expected.getDate() - i);
          const expectedDate = expected.toISOString().split('T')[0];
          const day = allDays.find(d => d.date === expectedDate);
          if (day && day.total_ml >= dailyGoal) {
            streak++;
          } else {
            break;
          }
        }

        setStats({ avgMl: avg, bestMl: best, streak, goalMetCount: goalMet });
      }
    } catch (error) {
      console.error('Failed to load water dashboard data:', error);
    }
  }

  const chartData = last7.map(d => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: d.total_ml,
    goalMet: d.total_ml >= dailyGoal,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Droplets size={24} color={COLORS.water} />
        <Text style={styles.title}>Water Intake</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCard
          label="Daily Avg"
          value={formatMl(stats.avgMl)}
          accentColor={COLORS.water}
        />
        <StatCard
          label="Best Day"
          value={formatMl(stats.bestMl)}
          accentColor={COLORS.success}
        />
        <StatCard
          label="Streak"
          value={`${stats.streak}d`}
          sub="days goal met"
          accentColor={COLORS.water}
        />
        <StatCard
          label="Goal Met"
          value={`${stats.goalMetCount}/7`}
          sub="this week"
          accentColor={COLORS.sleep}
        />
      </View>

      {/* 7-day chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        {chartData.length > 0 ? (
          <BarChart
            data={chartData}
            height={180}
            accentColor={COLORS.water}
            maxValue={Math.max(dailyGoal * 1.2, ...chartData.map(d => d.value))}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data yet — start logging water!</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${ml}ml`;
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
});
