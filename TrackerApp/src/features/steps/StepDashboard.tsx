import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useStepStore, hydrateStepStore } from '../../stores/stepStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from './BarChart';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function StepDashboard() {
  const db = useSQLiteContext();
  const { todaySteps, dailyGoal, weeklyData, monthlyData } = useStepStore();

  useEffect(() => { hydrateStepStore(db); }, []);

  // ── Computed stats ────────────────────────────────────────────────────────
  const allDays   = monthlyData.length > 0 ? monthlyData : weeklyData;
  const avgSteps  = allDays.length
    ? Math.round(allDays.reduce((s, d) => s + d.steps, 0) / allDays.length)
    : 0;
  const highSteps = allDays.length
    ? Math.max(...allDays.map((d) => d.steps))
    : 0;
  const lowSteps  = allDays.filter((d) => d.steps > 0).length
    ? Math.min(...allDays.filter((d) => d.steps > 0).map((d) => d.steps))
    : 0;
  const goalDays  = allDays.filter((d) => d.goal_met).length;
  const totalDist = allDays.reduce((s, d) => s + d.distance_m, 0);
  const totalCal  = allDays.reduce((s, d) => s + d.calories, 0);

  // Streak
  let streak = 0;
  const sorted = [...allDays].sort((a, b) => b.date.localeCompare(a.date));
  for (const d of sorted) {
    if (d.goal_met) streak++;
    else break;
  }

  const weeklyTotal = weeklyData.reduce((s, d) => s + d.steps, 0);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Today overview */}
      <Card style={styles.section}>
        <SectionTitle title="Today" />
        <View style={styles.statRow}>
          <StatCard
            label="Steps"
            value={todaySteps.toLocaleString()}
            sub={`Goal: ${dailyGoal.toLocaleString()}`}
            accentColor={COLORS.steps}
          />
          <StatCard
            label="Progress"
            value={`${Math.min(100, Math.round((todaySteps / dailyGoal) * 100))}%`}
            accentColor={COLORS.steps}
          />
        </View>
      </Card>

      {/* 7-day graph */}
      <Card style={styles.section}>
        <SectionTitle title="Last 7 Days" sub={`${weeklyTotal.toLocaleString()} total steps`} />
        <BarChart
          data={weeklyData.map((d) => ({
            label: shortDay(d.date),
            value: d.steps,
            goalMet: d.goal_met,
          }))}
          maxValue={Math.max(dailyGoal, highSteps, 1)}
          accentColor={COLORS.steps}
        />
      </Card>

      {/* Monthly graph */}
      {monthlyData.length > 7 && (
        <Card style={styles.section}>
          <SectionTitle title="Last 30 Days" />
          <BarChart
            data={monthlyData.map((d) => ({
              label: shortDate(d.date),
              value: d.steps,
              goalMet: d.goal_met,
            }))}
            maxValue={Math.max(dailyGoal, highSteps, 1)}
            accentColor={COLORS.steps}
            compact
          />
        </Card>
      )}

      {/* Stats grid */}
      <Card style={styles.section}>
        <SectionTitle title="Stats" />
        <View style={styles.statRow}>
          <StatCard label="Daily Avg"    value={avgSteps.toLocaleString()}  accentColor={COLORS.steps} />
          <StatCard label="Best Day"     value={highSteps.toLocaleString()} accentColor={COLORS.steps} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Lowest Day"   value={lowSteps > 0 ? lowSteps.toLocaleString() : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Goal Streak"  value={`${streak} days`} accentColor={streak > 0 ? COLORS.success : COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Days"    value={`${goalDays} days`}           accentColor={COLORS.steps} />
          <StatCard label="Total Dist"   value={`${(totalDist / 1000).toFixed(1)} km`} accentColor={COLORS.steps} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Total Cal"    value={`${Math.round(totalCal)} kcal`} accentColor={COLORS.calories} fullWidth />
        </View>
      </Card>
    </ScrollView>
  );
}

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

function shortDay(date: string): string {
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(date).getDay()];
}

function shortDate(date: string): string {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
  content: { padding: SPACING.xl, gap: SPACING.lg, paddingBottom: SPACING.huge },
  section: { gap: SPACING.md },
  statRow: { flexDirection: 'row', gap: SPACING.sm },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  sectionSub: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: 2,
  },
});
