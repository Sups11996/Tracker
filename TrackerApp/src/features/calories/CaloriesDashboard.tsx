import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Trash2 } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { useCaloriesStore, deleteWorkout, type WorkoutLog } from '../../stores/caloriesStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayCalories {
  date: string;
  total: number;
  goal_met: boolean;
}

export function CaloriesDashboard() {
  const db = useSQLiteContext();
  const { totalCalories, workoutLogs } = useCaloriesStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [thisWeekData, setThisWeekData] = useState<DayCalories[]>([]);
  const [currentMonthData, setCurrentMonthData] = useState<DayCalories[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<DayCalories[]>([]);
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutLog[]>([]);
  const [selectedBar, setSelectedBar] = useState<{ date: string; total: number; chartId: string; barIndex: number } | null>(null);

  useEffect(() => {
    loadWeekAndMonth();
    loadRecentWorkouts();
  }, [totalCalories, workoutLogs, db]);

  useEffect(() => {
    loadSelectedMonth(selectedMonth);
  }, [selectedMonth, db]);

  async function getDayCalories(dateStr: string, todayStr: string): Promise<number> {
    if (dateStr === todayStr) return totalCalories;
    const stepRow = await db.getFirstAsync<{ calories: number }>(
      `SELECT calories FROM daily_steps WHERE date = ?`, [dateStr]
    );
    const workoutRow = await db.getFirstAsync<{ total: number }>(
      `SELECT SUM(calories) as total FROM workout_logs WHERE date = ?`, [dateStr]
    );
    return Math.round((stepRow?.calories || 0) + (workoutRow?.total || 0));
  }

  async function loadWeekAndMonth() {
    try {
      const todayStr = getTodayStr();

      // ── This week ────────────────────────────────────────────────────────
      const weekDates = getThisWeekDates();
      const week: DayCalories[] = [];
      for (const dateStr of weekDates) {
        const total = await getDayCalories(dateStr, todayStr);
        week.push({ date: dateStr, total, goal_met: total > 0 });
      }
      setThisWeekData(week);

      // ── Current month ────────────────────────────────────────────────────
      const monthDates = getCurrentMonthDates();
      const month: DayCalories[] = [];
      for (const dateStr of monthDates) {
        const total = await getDayCalories(dateStr, todayStr);
        month.push({ date: dateStr, total, goal_met: total > 0 });
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

      const data: DayCalories[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const total = await getDayCalories(dateStr, todayStr);
        data.push({ date: dateStr, total, goal_met: total > 0 });
      }
      setSelectedMonthData(data);
    } catch (e) {
    }
  }

  async function loadRecentWorkouts() {
    try {
      const workouts = await db.getAllAsync<WorkoutLog>(
        `SELECT id, date, logged_at, duration_mins, intensity, calories, note
         FROM workout_logs
         ORDER BY logged_at DESC
         LIMIT 20`
      );
      setRecentWorkouts(workouts);
    } catch (e) {
    }
  }

  async function handleDeleteWorkout(id: number) {
    try {
      await deleteWorkout(db, id);
      setRecentWorkouts(prev => prev.filter(w => w.id !== id));
    } catch (e) {
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const weeksInMonth = getWeeksInCurrentMonth(currentMonthData);
  const weeklyTotal = thisWeekData.reduce((s, d) => s + d.total, 0);
  const allDays = currentMonthData.filter(d => d.total > 0);
  const highCal = allDays.length ? Math.max(...allDays.map(d => d.total)) : 0;

  const selectedStats = calculateMonthStats(selectedMonthData);

  // Stats card
  const avgCal = allDays.length ? Math.round(allDays.reduce((s, d) => s + d.total, 0) / allDays.length) : 0;
  const lowCal = allDays.length ? Math.min(...allDays.map(d => d.total)) : 0;
  let streak = 0;
  for (const d of [...allDays].sort((a, b) => b.date.localeCompare(a.date))) {
    if (d.total > 0) streak++; else break;
  }

  function goToPreviousMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (next <= new Date()) setSelectedMonth(next);
  }
  const canGoNext = selectedMonth.getMonth() < new Date().getMonth() || selectedMonth.getFullYear() < new Date().getFullYear();

  function handleBarPress(chartId: string, barIndex: number, data: DayCalories[]) {
    if (selectedBar?.chartId === chartId && selectedBar?.barIndex === barIndex) {
      setSelectedBar(null);
      return;
    }
    const d = data[barIndex];
    if (!d) return;
    setSelectedBar({ date: d.date, total: d.total, chartId, barIndex });
  }

  const todayStr = getTodayStr();
  const displayCal = selectedBar ? selectedBar.total : totalCalories;
  const displayDate = selectedBar ? selectedBar.date : todayStr;
  const cardTitle = displayDate === todayStr ? 'Today' : formatDate(displayDate) + ' · ' + formatDay(displayDate);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Today */}
      <Card style={styles.section}>
        <SectionTitle title={cardTitle} />
        <View style={styles.statRow}>
          <StatCard
            label="Calories"
            value={`${displayCal} kcal`}
            sub={selectedBar ? formatDate(displayDate) : 'Walking + Workouts'}
            accentColor={COLORS.calories}
          />
          <StatCard
            label={displayDate === todayStr ? 'Workouts' : 'Active'}
            value={displayDate === todayStr ? workoutLogs.length.toString() : (displayCal > 0 ? 'Yes' : 'Rest')}
            sub={displayDate === todayStr ? 'today' : undefined}
            accentColor={COLORS.calories}
          />
        </View>
      </Card>

      {/* This week */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={`${weeklyTotal} kcal total`} />
        <BarChart
          data={thisWeekData.map(d => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.total,
            valueLabel: d.total > 0 ? `${d.total}` : '',
            goalMet: d.goal_met,
          }))}
          maxValue={Math.max(highCal, 500, 1)}
          accentColor={COLORS.calories}
          selectedIndex={selectedBar?.chartId === 'week' ? selectedBar.barIndex : undefined}
          onBarPress={(i) => handleBarPress('week', i, thisWeekData)}
        />
      </Card>

      {/* Weekly graphs for current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d: DayCalories) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.total,
              valueLabel: d.total > 0 ? `${d.total}` : '',
              goalMet: d.goal_met,
            }))}
            maxValue={Math.max(highCal, 500, 1)}
            accentColor={COLORS.calories}
            selectedIndex={selectedBar?.chartId === `month-${index}` ? selectedBar.barIndex : undefined}
            onBarPress={(i) => handleBarPress(`month-${index}`, i, week.data)}
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
          <StatCard label="Total" value={`${selectedStats.totalCal} kcal`} accentColor={COLORS.calories} />
          <StatCard label="Daily Avg" value={`${selectedStats.avgCal} kcal`} accentColor={COLORS.calories} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Most" value={`${selectedStats.mostCal} kcal`} accentColor={COLORS.success} />
          <StatCard label="Least" value={selectedStats.leastCal > 0 ? `${selectedStats.leastCal} kcal` : '—'} accentColor={COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Active Days" value={`${selectedStats.activeDays} days`} accentColor={COLORS.calories} />
          <StatCard label="Rest Days" value={`${selectedStats.restDays} days`} accentColor={COLORS.textSecondary} />
        </View>
      </Card>

      {/* Stats */}
      <Card style={styles.section}>
        <SectionTitle title="Stats" />
        <View style={styles.statRow}>
          <StatCard label="Daily Avg" value={`${avgCal} kcal`} accentColor={COLORS.calories} />
          <StatCard label="Best Day" value={`${highCal} kcal`} accentColor={COLORS.calories} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Lowest Day" value={lowCal > 0 ? `${lowCal} kcal` : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Active Streak" value={`${streak} days`} accentColor={streak > 0 ? COLORS.success : COLORS.textSecondary} />
        </View>
      </Card>

      {/* Recent Workouts */}
      <Card style={styles.section}>
        <SectionTitle title="Recent Workouts" />
        {recentWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts logged yet</Text>
        ) : (
          <View style={styles.workoutList}>
            {recentWorkouts.map(w => (
              <View key={w.id} style={styles.workoutRow}>
                <View style={styles.workoutInfo}>
                  <Text style={styles.workoutTitle}>
                    {w.duration_mins}min · {capitalize(w.intensity)}{w.note ? ` · ${w.note}` : ''}
                  </Text>
                  <Text style={styles.workoutDate}>
                    {new Date(w.logged_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <View style={styles.workoutRight}>
                  <Text style={styles.workoutCal}>{w.calories} kcal</Text>
                  <TouchableOpacity onPress={() => handleDeleteWorkout(w.id)} hitSlop={8}>
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

function getWeeksInCurrentMonth(monthData: DayCalories[]) {
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

function calculateMonthStats(monthData: DayCalories[]) {
  const days = monthData.filter(d => d.total > 0);
  return {
    totalCal: monthData.reduce((s, d) => s + d.total, 0),
    avgCal: days.length ? Math.round(monthData.reduce((s, d) => s + d.total, 0) / days.length) : 0,
    mostCal: days.length ? Math.max(...days.map(d => d.total)) : 0,
    leastCal: days.length ? Math.min(...days.map(d => d.total)) : 0,
    activeDays: days.length,
    restDays: monthData.length - days.length,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
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
  emptyText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    textAlign: 'center',
    paddingVertical: SPACING.md,
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
    backgroundColor: COLORS.calories,
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
