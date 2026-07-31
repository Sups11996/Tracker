import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, RefreshControl } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Smartphone } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import {
  useScreenTimeStore,
  fetchScreenTimeStats,
  formatScreenTime,
  type AppUsage,
} from '../../stores/screenTimeStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayScreenTime {
  date: string;
  total_screen_ms: number;
  unlock_count: number;
}

export function ScreenTimeDashboard() {
  const db = useSQLiteContext();
  const { hasPermission, apps } = useScreenTimeStore();

  const [refreshing, setRefreshing] = useState(false);
  const [last7, setLast7] = useState<DayScreenTime[]>([]);
  const [stats, setStats] = useState({
    avgScreenTime: 0,
    maxScreenTime: 0,
    avgUnlocks: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    if (!hasPermission) return;

    try {
      // Fetch fresh stats from native
      await fetchScreenTimeStats();

      // Load 7-day history from SQLite
      const rows = await db.getAllAsync<DayScreenTime>(
        `SELECT date, total_screen_ms, unlock_count
         FROM screen_time_daily_summary
         ORDER BY date DESC
         LIMIT 7`
      );

      const sorted = rows.reverse();
      setLast7(sorted);

      if (sorted.length > 0) {
        const avgScreen = Math.round(
          sorted.reduce((sum, d) => sum + d.total_screen_ms, 0) / sorted.length
        );
        const maxScreen = Math.max(...sorted.map(d => d.total_screen_ms));
        const avgUnlocks = Math.round(
          sorted.reduce((sum, d) => sum + d.unlock_count, 0) / sorted.length
        );

        setStats({ avgScreenTime: avgScreen, maxScreenTime: maxScreen, avgUnlocks });
      }
    } catch (error) {
      console.error('Failed to load screen time dashboard:', error);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Smartphone size={48} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>Permission required</Text>
          <Text style={styles.emptySubtext}>Grant Usage Access in Settings to view dashboard</Text>
        </View>
      </View>
    );
  }

  const chartData = last7.map(d => ({
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: d.total_screen_ms / 1000 / 60 / 60, // Convert to hours
  }));

  const maxHours = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 1) : 8;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.screenTime} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Smartphone size={24} color={COLORS.screenTime} />
        <Text style={styles.title}>Screen Time</Text>
      </View>

      {/* Stats grid */}
      <View style={styles.grid}>
        <StatCard
          label="Daily Avg"
          value={formatScreenTime(stats.avgScreenTime)}
          accentColor={COLORS.screenTime}
        />
        <StatCard
          label="Peak Day"
          value={formatScreenTime(stats.maxScreenTime)}
          accentColor={COLORS.calories}
        />
        <StatCard
          label="Avg Unlocks"
          value={`${stats.avgUnlocks}`}
          sub="per day"
          accentColor={COLORS.textMuted}
        />
        <StatCard
          label="Today's Apps"
          value={`${apps.length}`}
          sub="used"
          accentColor={COLORS.screenTime}
        />
      </View>

      {/* 7-day chart */}
      <Card style={styles.chartCard}>
        <Text style={styles.chartTitle}>Last 7 Days (hours)</Text>
        {chartData.length > 0 ? (
          <BarChart
            data={chartData}
            height={180}
            accentColor={COLORS.screenTime}
            maxValue={Math.ceil(maxHours)}
          />
        ) : (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyText}>No data yet</Text>
          </View>
        )}
      </Card>

      {/* App breakdown */}
      <Card style={styles.appsCard}>
        <Text style={styles.chartTitle}>Today's Apps</Text>
        {apps.length === 0 ? (
          <Text style={styles.emptyText}>No apps used yet today</Text>
        ) : (
          <View style={styles.appList}>
            {apps.slice(0, 10).map((app, idx) => (
              <AppRow key={app.packageName} app={app} rank={idx + 1} />
            ))}
          </View>
        )}
      </Card>
    </ScrollView>
  );
}

function AppRow({ app, rank }: { app: AppUsage; rank: number }) {
  return (
    <View style={styles.appRow}>
      <Text style={styles.appRank}>{rank}</Text>
      <View style={styles.appInfo}>
        <Text style={styles.appName} numberOfLines={1}>{app.appName}</Text>
        <Text style={styles.appTime}>{formatScreenTime(app.totalTimeMs)}</Text>
      </View>
      <Text style={styles.appLaunches}>{app.launchCount}×</Text>
    </View>
  );
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
  emptyChart: {
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  emptySubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  appsCard: { gap: SPACING.md },
  appList: { gap: SPACING.xs },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  appRank: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textMuted,
    width: 24,
    textAlign: 'center',
  },
  appInfo: {
    flex: 1,
    gap: 2,
  },
  appName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  appTime: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.screenTime,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  appLaunches: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
});
