import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Flame, Trash2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import {
  useCaloriesStore,
  deleteWorkout,
  type WorkoutLog,
} from '../../stores/caloriesStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayCalories {
  date: string;
  total: number;
}

export function CaloriesDashboard() {
  const db = useSQLiteContext();
  const { workoutLogs } = useCaloriesStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [last7, setLast7] = useState<DayCalories[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<WorkoutLog[]>([]);
  const [stats, setStats] = useState({
    avgTotal: 0,
    bestDay: 0,
    totalWorkouts: 0,
    avgWorkoutCal: 0,
  });

  useEffect(() => {
    loadData();
  }, [workoutLogs]);

  async function loadData() {
    try {
      // 7-day calories (walking + workout combined)
      const stepRows = await db.getAllAsync<{ date: string; calories: number }>(
        `SELECT date, calories FROM daily_steps ORDER BY date DESC LIMIT 7`
      );
      const workoutRows = await db.getAllAsync<{ date: string; total: number }>(
        `SELECT date, SUM(calories) as total FROM workout_logs GROUP BY date ORDER BY date DESC LIMIT 7`
      );

      // Merge by date
      const dateMap: Record<string, number> = {};
      for (const r of stepRows) dateMap[r.date] = (dateMap[r.date] ?? 0) + r.calories;
      for (const r of workoutRows) dateMap[r.date] = (dateMap[r.date] ?? 0) + r.total;

      const sorted = Object.entries(dateMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-7)
        .map(([date, total]) => ({ date, total: Math.round(total) }));

      setLast7(sorted);

      // Stats
      if (sorted.length > 0) {
        const totals = sorted.map(d => d.total);
        const avg = Math.round(totals.reduce((a, b) => a + b, 0) / totals.length);
        const best = Math.max(...totals);
        setStats(s => ({ ...s, avgTotal: avg, bestDay: best }));
      }

      // All recent workouts (last 14 days)
      const workouts = await db.getAllAsync<WorkoutLog>(
        `SELECT id, date, logged_at, duration_mins, intensity, calories, note
         FROM workout_logs
         ORDER BY logged_at DESC
         LIMIT 20`
      );
      setAllWorkouts(workouts);

      const totalWorkouts = workouts.length;
      const avgWoCal = totalWorkouts > 0
        ? Math.round(workouts.reduce((s, w) => s + w.calories, 0) / totalWorkouts)
        : 0;
      setStats(s => ({ ...s, totalWorkouts, avgWorkoutCal: avgWoCal }));

    } catch (error) {
      console.error('Failed to load calories dashboard:', error);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteWorkout(db, id);
      setAllWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (e) {
      // silent fail — UI reverts on next hydration
    }
  }

  const chartData = last7.map(d => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: d.total,
  }));

  const maxVal = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 500) : 500;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Flame size={24} color={COLORS.calories} />
        <Text style={styles.title}>Calories</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCard label="Daily Avg" value={`${stats.avgTotal}`} sub="kcal" accentColor={COLORS.calories} />
        <StatCard label="Best Day"  value={`${stats.bestDay}`}  sub="kcal" accentColor={COLORS.success} />
        <StatCard label="Workouts"  value={`${stats.totalWorkouts}`} sub="logged" accentColor={COLORS.calories} />
        <StatCard label="Avg Workout" value={`${stats.avgWorkoutCal}`} sub="kcal" accentColor={COLORS.steps} />
      </View>

      {/* 7-day chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days (kcal)</Text>
        {chartData.length > 0 ? (
          <BarChart
            data={chartData}
            height={180}
            accentColor={COLORS.calories}
            maxValue={maxVal}
          />
        ) : (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* Workout history */}
      <Card style={styles.historyCard}>
        <Text style={styles.chartTitle}>Recent Workouts</Text>
        {allWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts logged yet</Text>
        ) : (
          <View style={styles.workoutList}>
            {allWorkouts.map((w) => (
              <View key={w.id} style={styles.workoutRow}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>
                    {w.duration_mins}min · {capitalize(w.intensity)}
                    {w.note ? ` · ${w.note}` : ''}
                  </Text>
                  <Text style={styles.workoutDate}>
                    {new Date(w.logged_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric',
                    })}
                  </Text>
                </View>
                <View style={styles.workoutRight}>
                  <Text style={styles.workoutCal}>{w.calories} kcal</Text>
                  <TouchableOpacity onPress={() => handleDelete(w.id)} hitSlop={8}>
                    <Trash2 size={16} color={COLORS.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  historyCard: { gap: SPACING.md },
  workoutList: { gap: SPACING.sm },
  workoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  workoutInfo: { flex: 1, gap: 2 },
  workoutTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  workoutDate: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  workoutRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  workoutCal: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.calories,
  },
});
