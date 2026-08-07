import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSleepStore } from '../../stores/sleepStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DaySleep {
  date: string;
  duration: number; // minutes
  goal: number;     // minutes
  goal_met: boolean;
}

export function SleepDashboard() {
  const db = useSQLiteContext();
  const { goalMinutes, isActive, elapsedMinutes } = useSleepStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [thisWeekData, setThisWeekData] = useState<DaySleep[]>([]);
  const [currentMonthData, setCurrentMonthData] = useState<DaySleep[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<DaySleep[]>([]);
  const [selectedBar, setSelectedBar] = useState<{ date: string; duration: number; goal: number; chartId: string; barIndex: number } | null>(null);

  useEffect(() => {
    loadWeekAndMonth();
  }, [isActive, elapsedMinutes, db]);

  useEffect(() => {
    loadSelectedMonth(selectedMonth);
  }, [selectedMonth, db]);

  async function getSleepForDate(dateStr: string, todayStr: string): Promise<number> {
    if (dateStr === todayStr && isActive && elapsedMinutes > 0) {
      return elapsedMinutes;
    }
    const row = await db.getFirstAsync<{ actual_duration: number }>(
      `SELECT actual_duration FROM sleep_sessions
       WHERE is_active = 0 AND actual_duration IS NOT NULL AND date = ?
       ORDER BY end_time DESC LIMIT 1`,
      [dateStr]
    );
    return row?.actual_duration || 0;
  }

  async function loadWeekAndMonth() {
    try {
      const todayStr = getTodayStr();

      // ── This week ─────────────────────────────────────────────────────────
      const weekDates = getThisWeekDates();
      const week: DaySleep[] = [];
      for (const dateStr of weekDates) {
        const duration = await getSleepForDate(dateStr, todayStr);
        week.push({ date: dateStr, duration, goal: goalMinutes, goal_met: duration >= goalMinutes && duration > 0 });
      }
      setThisWeekData(week);

      // ── Current month ─────────────────────────────────────────────────────
      const monthDates = getCurrentMonthDates();
      const month: DaySleep[] = [];
      for (const dateStr of monthDates) {
        const duration = await getSleepForDate(dateStr, todayStr);
        month.push({ date: dateStr, duration, goal: goalMinutes, goal_met: duration >= goalMinutes && duration > 0 });
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

      const data: DaySleep[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const duration = await getSleepForDate(dateStr, todayStr);
        data.push({ date: dateStr, duration, goal: goalMinutes, goal_met: duration >= goalMinutes && duration > 0 });
      }
      setSelectedMonthData(data);
    } catch (e) {
    }
  }

  // ── Derived values ──────────────────────────────────────────────────────────
  const weeksInMonth = getWeeksInCurrentMonth(currentMonthData);
  const weeklyAvg = (() => {
    const days = thisWeekData.filter(d => d.duration > 0);
    return days.length ? Math.round(days.reduce((s, d) => s + d.duration, 0) / days.length) : 0;
  })();
  const allDays = currentMonthData.filter(d => d.duration > 0);
  const highSleep = allDays.length ? Math.max(...allDays.map(d => d.duration)) : 0;
  const maxBarValue = Math.max(goalMinutes, highSleep, 60);

  const selectedStats = calculateMonthStats(selectedMonthData, goalMinutes);

  // Stats card
  const avgSleep = allDays.length ? Math.round(allDays.reduce((s, d) => s + d.duration, 0) / allDays.length) : 0;
  const lowSleep = allDays.length ? Math.min(...allDays.map(d => d.duration)) : 0;
  const goalDays = allDays.filter(d => d.goal_met).length;
  let streak = 0;
  for (const d of [...allDays].sort((a, b) => b.date.localeCompare(a.date))) {
    if (d.goal_met) streak++; else break;
  }

  // Today's sleep
  const todayStr = getTodayStr();
  const todaySleep = isActive && elapsedMinutes > 0
    ? elapsedMinutes
    : thisWeekData.find(d => d.date === todayStr)?.duration || 0;

  function goToPreviousMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  function goToNextMonth() {
    const next = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (next <= new Date()) setSelectedMonth(next);
  }
  const canGoNext = selectedMonth.getMonth() < new Date().getMonth() || selectedMonth.getFullYear() < new Date().getFullYear();

  function handleBarPress(chartId: string, barIndex: number, data: DaySleep[]) {
    if (selectedBar?.chartId === chartId && selectedBar?.barIndex === barIndex) {
      setSelectedBar(null);
      return;
    }
    const d = data[barIndex];
    if (!d) return;
    setSelectedBar({ date: d.date, duration: d.duration, goal: d.goal, chartId, barIndex });
  }

  const displayDuration = selectedBar ? selectedBar.duration : todaySleep;
  const displayGoal = selectedBar ? selectedBar.goal : goalMinutes;
  const displayDate = selectedBar ? selectedBar.date : todayStr;
  const displayProgress = displayGoal > 0 ? Math.min(100, Math.round((displayDuration / displayGoal) * 100)) : 0;
  const displayRemaining = Math.max(0, displayGoal - displayDuration);
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
            label="Sleep"
            value={displayDuration > 0 ? formatDuration(displayDuration) : '—'}
            sub={isActive && displayDate === todayStr ? 'Session active' : `Goal: ${formatDuration(displayGoal)}`}
            accentColor={COLORS.sleep}
          />
          <StatCard
            label="Progress"
            value={displayDuration > 0 ? `${displayProgress}%` : '—'}
            accentColor={COLORS.sleep}
          />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard
            label="Remaining"
            value={displayDuration > 0 ? (displayRemaining > 0 ? formatDuration(displayRemaining) : 'Goal reached!') : '—'}
            accentColor={displayRemaining > 0 ? COLORS.textSecondary : COLORS.success}
          />
          <StatCard
            label="Quality"
            value={displayDuration > 0 ? getSleepQuality(displayDuration, displayGoal) : '—'}
            accentColor={COLORS.sleep}
          />
        </View>
      </Card>

      {/* This week */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={weeklyAvg > 0 ? `Avg ${formatDuration(weeklyAvg)}/night` : 'No data yet'} />
        <BarChart
          data={thisWeekData.map(d => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.duration,
            valueLabel: d.duration > 0 ? formatDuration(d.duration) : '',
            goalMet: d.goal_met,
          }))}
          maxValue={maxBarValue}
          accentColor={COLORS.sleep}
          selectedIndex={selectedBar?.chartId === 'week' ? selectedBar.barIndex : undefined}
          onBarPress={(i) => handleBarPress('week', i, thisWeekData)}
        />
      </Card>

      {/* Weekly graphs for current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d: DaySleep) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.duration,
              valueLabel: d.duration > 0 ? formatDuration(d.duration) : '',
              goalMet: d.goal_met,
            }))}
            maxValue={maxBarValue}
            accentColor={COLORS.sleep}
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
          <StatCard label="Avg Sleep" value={formatDuration(selectedStats.avgSleep)} accentColor={COLORS.sleep} />
          <StatCard label="Best Night" value={formatDuration(selectedStats.mostSleep)} accentColor={COLORS.success} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Least Sleep" value={selectedStats.leastSleep > 0 ? formatDuration(selectedStats.leastSleep) : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Nights Tracked" value={`${selectedStats.trackedDays}`} accentColor={COLORS.sleep} />
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
          <StatCard label="Avg Sleep" value={formatDuration(avgSleep)} accentColor={COLORS.sleep} />
          <StatCard label="Best Night" value={formatDuration(highSleep)} accentColor={COLORS.sleep} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Shortest" value={lowSleep > 0 ? formatDuration(lowSleep) : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Goal Streak" value={`${streak} days`} accentColor={streak > 0 ? COLORS.success : COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Days" value={`${goalDays} days`} accentColor={COLORS.sleep} />
          <StatCard label="Nights Logged" value={`${allDays.length}`} accentColor={COLORS.sleep} />
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

function getWeeksInCurrentMonth(monthData: DaySleep[]) {
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

function calculateMonthStats(monthData: DaySleep[], goalMinutes: number) {
  const days = monthData.filter(d => d.duration > 0);
  return {
    avgSleep: days.length ? Math.round(days.reduce((s, d) => s + d.duration, 0) / days.length) : 0,
    mostSleep: days.length ? Math.max(...days.map(d => d.duration)) : 0,
    leastSleep: days.length ? Math.min(...days.map(d => d.duration)) : 0,
    trackedDays: days.length,
    goalReached: days.filter(d => d.goal_met).length,
    goalMissed: days.length - days.filter(d => d.goal_met).length,
  };
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

function getSleepQuality(duration: number, goal: number): string {
  const pct = duration / goal;
  if (pct >= 1.0) return 'Great';
  if (pct >= 0.85) return 'Good';
  if (pct >= 0.65) return 'Fair';
  return 'Poor';
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
    backgroundColor: COLORS.sleep,
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
