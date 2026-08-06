import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useWaterStore, hydrateWaterStore } from '../../stores/waterStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayWater {
  date: string;
  total_ml: number;
  goal_ml: number;
  goal_met: boolean;
}

export function WaterDashboard() {
  const db = useSQLiteContext();
  const { todayTotal, dailyGoal } = useWaterStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [thisWeekData, setThisWeekData] = useState<DayWater[]>([]);
  const [currentMonthData, setCurrentMonthData] = useState<DayWater[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<DayWater[]>([]);

  useEffect(() => { hydrateWaterStore(db); }, []);

  // Reload week + current month whenever todayTotal changes
  useEffect(() => {
    loadWeekAndMonth();
  }, [todayTotal, db]);

  useEffect(() => {
    loadSelectedMonth(selectedMonth);
  }, [selectedMonth, db]);

  async function loadWeekAndMonth() {
    try {
      const todayStr = getTodayStr();

      // ── This week ──────────────────────────────────────────────────────────
      const weekDates = getThisWeekDates();
      const week: DayWater[] = [];
      for (const dateStr of weekDates) {
        if (dateStr === todayStr) {
          week.push({ date: dateStr, total_ml: todayTotal, goal_ml: dailyGoal, goal_met: todayTotal >= dailyGoal });
        } else {
          const row = await db.getFirstAsync<{ total_ml: number }>(
            `SELECT SUM(capacity_ml) as total_ml FROM water_logs WHERE date = ?`, [dateStr]
          );
          const ml = row?.total_ml || 0;
          week.push({ date: dateStr, total_ml: ml, goal_ml: dailyGoal, goal_met: ml >= dailyGoal });
        }
      }
      setThisWeekData(week);

      // ── Current month (day 1 to today) ────────────────────────────────────
      const monthDates = getCurrentMonthDates();
      const month: DayWater[] = [];
      for (const dateStr of monthDates) {
        if (dateStr === todayStr) {
          month.push({ date: dateStr, total_ml: todayTotal, goal_ml: dailyGoal, goal_met: todayTotal >= dailyGoal });
        } else {
          const row = await db.getFirstAsync<{ total_ml: number }>(
            `SELECT SUM(capacity_ml) as total_ml FROM water_logs WHERE date = ?`, [dateStr]
          );
          const ml = row?.total_ml || 0;
          month.push({ date: dateStr, total_ml: ml, goal_ml: dailyGoal, goal_met: ml >= dailyGoal });
        }
      }
      setCurrentMonthData(month);
    } catch (e) {
    }
  }

  async function loadSelectedMonth(month: Date) {
    try {
      const todayStr = getTodayStr();
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
      const isCurrentMonth = month.getMonth() === new Date().getMonth() && month.getFullYear() === new Date().getFullYear();
      const lastDay = isCurrentMonth ? new Date().getDate() : daysInMonth;

      const data: DayWater[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (dateStr === todayStr) {
          data.push({ date: dateStr, total_ml: todayTotal, goal_ml: dailyGoal, goal_met: todayTotal >= dailyGoal });
        } else {
          const row = await db.getFirstAsync<{ total_ml: number }>(
            `SELECT SUM(capacity_ml) as total_ml FROM water_logs WHERE date = ?`, [dateStr]
          );
          const ml = row?.total_ml || 0;
          data.push({ date: dateStr, total_ml: ml, goal_ml: dailyGoal, goal_met: ml >= dailyGoal });
        }
      }
      setSelectedMonthData(data);
    } catch (e) {
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const weeksInMonth = getWeeksInCurrentMonth(currentMonthData);
  const weeklyTotal = thisWeekData.reduce((s, d) => s + d.total_ml, 0);
  const allDays = currentMonthData.filter(d => d.total_ml > 0);
  const highMl = allDays.length ? Math.max(...allDays.map(d => d.total_ml)) : 0;

  const selectedStats = calculateMonthStats(selectedMonthData, dailyGoal);

  // Stats card
  const avgMl = allDays.length ? Math.round(allDays.reduce((s, d) => s + d.total_ml, 0) / allDays.length) : 0;
  const lowMl = allDays.length ? Math.min(...allDays.map(d => d.total_ml)) : 0;
  const goalDays = allDays.filter(d => d.goal_met).length;
  let streak = 0;
  for (const d of [...allDays].sort((a, b) => b.date.localeCompare(a.date))) {
    if (d.goal_met) streak++; else break;
  }

  function goToPreviousMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (next <= new Date()) setSelectedMonth(next);
  }
  const canGoNext = selectedMonth.getMonth() < new Date().getMonth() || selectedMonth.getFullYear() < new Date().getFullYear();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Today */}
      <Card style={styles.section}>
        <SectionTitle title="Today" />
        <View style={styles.statRow}>
          <StatCard
            label="Water"
            value={formatMl(todayTotal)}
            sub={`Goal: ${formatMl(dailyGoal)}`}
            accentColor={COLORS.water}
          />
          <StatCard
            label="Progress"
            value={`${Math.min(100, Math.round((todayTotal / dailyGoal) * 100))}%`}
            accentColor={COLORS.water}
          />
        </View>
      </Card>

      {/* This week */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={`${formatMl(weeklyTotal)} total`} />
        <BarChart
          data={thisWeekData.map(d => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.total_ml,
            valueLabel: d.total_ml > 0 ? formatMl(d.total_ml) : '',
            goalMet: d.goal_met,
          }))}
          maxValue={Math.max(dailyGoal, highMl, 1)}
          accentColor={COLORS.water}
        />
      </Card>

      {/* Weekly graphs for current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d: DayWater) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.total_ml,
              valueLabel: d.total_ml > 0 ? formatMl(d.total_ml) : '',
              goalMet: d.goal_met,
            }))}
            maxValue={Math.max(dailyGoal, highMl, 1)}
            accentColor={COLORS.water}
          />
        </Card>
      ))}

      {/* Month selector */}
      <Card style={styles.section}>
        <View style={styles.monthSelector}>
          <TouchableOpacity onPress={goToPreviousMonth} style={styles.monthButton}>
            <Text style={styles.monthButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthButton, !canGoNext && styles.monthButtonDisabled]}
            disabled={!canGoNext}
          >
            <Text style={[styles.monthButtonText, !canGoNext && styles.monthButtonTextDisabled]}>→</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statRow}>
          <StatCard label="Total" value={formatMl(selectedStats.totalMl)} accentColor={COLORS.water} />
          <StatCard label="Daily Avg" value={formatMl(selectedStats.avgMl)} accentColor={COLORS.water} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Most" value={formatMl(selectedStats.mostMl)} accentColor={COLORS.success} />
          <StatCard label="Least" value={selectedStats.leastMl > 0 ? formatMl(selectedStats.leastMl) : '—'} accentColor={COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Reached" value={`${selectedStats.goalReached} days`} accentColor={COLORS.success} />
          <StatCard label="Goal Missed" value={`${selectedStats.goalMissed} days`} accentColor={COLORS.error} />
        </View>
      </Card>

      {/* Stats */}
      <Card style={styles.section}>
        <SectionTitle title="Stats" />
        <View style={styles.statRow}>
          <StatCard label="Daily Avg" value={formatMl(avgMl)} accentColor={COLORS.water} />
          <StatCard label="Best Day" value={formatMl(highMl)} accentColor={COLORS.water} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Lowest Day" value={lowMl > 0 ? formatMl(lowMl) : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Goal Streak" value={`${streak} days`} accentColor={streak > 0 ? COLORS.success : COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Days" value={`${goalDays} days`} accentColor={COLORS.water} />
          <StatCard label="Monthly Tot" value={formatMl(allDays.reduce((s, d) => s + d.total_ml, 0))} accentColor={COLORS.water} />
        </View>
      </Card>
    </ScrollView>
  );
}

// ── Helper components ──────────────────────────────────────────────────────────

function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <View style={{ marginBottom: SPACING.md }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {sub ? <Text style={styles.sectionSub}>{sub}</Text> : null}
    </View>
  );
}

// ── Helper functions ───────────────────────────────────────────────────────────

function getTodayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  });
}

function getCurrentMonthDates(): string[] {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  return Array.from({ length: today.getDate() }, (_, i) => {
    const day = i + 1;
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  });
}

function getWeeksInCurrentMonth(monthData: DayWater[]) {
  if (monthData.length === 0) return [];
  const weeks: any[] = [];
  for (let i = 0; i < monthData.length; i += 7) {
    const weekData = monthData.slice(i, i + 7);
    const [sy, sm, sd] = weekData[0].date.split('-').map(Number);
    const [ey, em, ed] = weekData[weekData.length - 1].date.split('-').map(Number);
    const startDate = new Date(sy, sm - 1, sd);
    const endDate = new Date(ey, em - 1, ed);
    weeks.push({
      data: weekData,
      dateRange: `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    });
  }
  return weeks;
}

function calculateMonthStats(monthData: DayWater[], dailyGoal: number) {
  const days = monthData.filter(d => d.total_ml > 0);
  return {
    totalMl: monthData.reduce((s, d) => s + d.total_ml, 0),
    avgMl: days.length ? Math.round(monthData.reduce((s, d) => s + d.total_ml, 0) / days.length) : 0,
    mostMl: days.length ? Math.max(...days.map(d => d.total_ml)) : 0,
    leastMl: days.length ? Math.min(...days.map(d => d.total_ml)) : 0,
    goalReached: monthData.filter(d => d.goal_met).length,
    goalMissed: days.length - monthData.filter(d => d.goal_met).length,
  };
}

function formatMl(ml: number): string {
  if (ml >= 1000) return `${(ml / 1000).toFixed(1)}L`;
  return `${Math.round(ml)}ml`;
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: SPACING.xl, gap: SPACING.lg },
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
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  monthTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  monthButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.water,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonDisabled: {
    backgroundColor: COLORS.cardSecondary,
  },
  monthButtonText: {
    fontSize: TYPOGRAPHY.size.xl,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weight.bold,
  },
  monthButtonTextDisabled: {
    color: COLORS.textMuted,
  },
});
