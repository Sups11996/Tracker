import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAbcStore, hydrateAbcStore } from '../../stores/abcStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from '../steps/BarChart';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayAbc {
  date: string;
  count: number;
  goal: number;
  goal_met: boolean;
}

export function AbcDashboard() {
  const db = useSQLiteContext();
  const { todayCount, dailyGoal } = useAbcStore();
  const tabBarHeight = useBottomTabBarHeight();

  const [isLoading, setIsLoading] = useState(true);
  const [thisWeekData, setThisWeekData] = useState<DayAbc[]>([]);
  const [currentMonthData, setCurrentMonthData] = useState<DayAbc[]>([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedMonthData, setSelectedMonthData] = useState<DayAbc[]>([]);
  const [selectedBar, setSelectedBar] = useState<{ date: string; count: number; goal: number; chartId: string; barIndex: number } | null>(null);

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => { hydrateAbcStore(db); }, []);

  // Slide up + fade in when loading completes
  useEffect(() => {
    if (!isLoading) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 600,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isLoading]);

  useEffect(() => {
    loadWeekAndMonth();
  }, [todayCount, dailyGoal, db]);

  useEffect(() => {
    loadSelectedMonth(selectedMonth);
  }, [selectedMonth, dailyGoal, db]);

  async function getCountForDate(dateStr: string, todayStr: string): Promise<number> {
    if (dateStr === todayStr) return todayCount;
    const row = await db.getFirstAsync<{ count: number }>(
      `SELECT count FROM abc_daily_summary WHERE date = ?`, [dateStr]
    );
    return row?.count || 0;
  }

  async function loadWeekAndMonth() {
    try {
      setIsLoading(true);
      const todayStr = getTodayStr();

      // This week
      const weekDates = getThisWeekDates();
      const week: DayAbc[] = [];
      for (const dateStr of weekDates) {
        const count = await getCountForDate(dateStr, todayStr);
        week.push({ date: dateStr, count, goal: dailyGoal, goal_met: count >= dailyGoal && count > 0 });
      }
      setThisWeekData(week);

      // Current month
      const monthDates = getCurrentMonthDates();
      const month: DayAbc[] = [];
      for (const dateStr of monthDates) {
        const count = await getCountForDate(dateStr, todayStr);
        month.push({ date: dateStr, count, goal: dailyGoal, goal_met: count >= dailyGoal && count > 0 });
      }
      setCurrentMonthData(month);

      // Short delay to ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 200));
      setIsLoading(false);
    } catch (e) {
      setIsLoading(false);
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

      const data: DayAbc[] = [];
      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = await getCountForDate(dateStr, todayStr);
        data.push({ date: dateStr, count, goal: dailyGoal, goal_met: count >= dailyGoal && count > 0 });
      }
      setSelectedMonthData(data);
    } catch (e) { }
  }

  // Derived values
  const weeksInMonth = getWeeksInCurrentMonth(currentMonthData);
  const weeklyTotal = thisWeekData.reduce((s, d) => s + d.count, 0);
  const allDays = currentMonthData.filter(d => d.count > 0);
  const highCount = allDays.length ? Math.max(...allDays.map(d => d.count)) : 0;

  const selectedStats = calculateMonthStats(selectedMonthData, dailyGoal);

  const avgCount = allDays.length ? Math.round(allDays.reduce((s, d) => s + d.count, 0) / allDays.length) : 0;
  const lowCount = allDays.length ? Math.min(...allDays.map(d => d.count)) : 0;
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

  function handleBarPress(chartId: string, barIndex: number, data: DayAbc[]) {
    if (selectedBar?.chartId === chartId && selectedBar?.barIndex === barIndex) {
      setSelectedBar(null);
      return;
    }
    const d = data[barIndex];
    if (!d) return;
    setSelectedBar({ date: d.date, count: d.count, goal: d.goal, chartId, barIndex });
  }

  const todayStr = getTodayStr();
  const displayCount = selectedBar ? selectedBar.count : todayCount;
  const displayGoal = selectedBar ? selectedBar.goal : dailyGoal;
  const displayDate = selectedBar ? selectedBar.date : todayStr;
  const displayProgress = displayGoal > 0 ? Math.min(100, Math.round((displayCount / displayGoal) * 100)) : 0;
  const displayRemaining = Math.max(0, displayGoal - displayCount);
  const cardTitle = displayDate === todayStr ? 'Today' : formatDate(displayDate) + ' · ' + formatDay(displayDate);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <View style={{ flex: 1, padding: SPACING.xl, gap: SPACING.lg }}>
        <SkeletonCard lines={4} height={200} />
        <SkeletonCard lines={3} height={150} />
        <SkeletonCard lines={2} height={100} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: tabBarHeight + SPACING.lg }}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        {/* Today */}
      <Card style={styles.section}>
        <SectionTitle title={cardTitle} />
        <View style={styles.statRow}>
          <StatCard
            label="Count"
            value={displayCount.toString()}
            sub={`Goal: ${displayGoal}`}
            accentColor={COLORS.abc}
          />
          <StatCard
            label="Progress"
            value={`${displayProgress}%`}
            accentColor={COLORS.abc}
          />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard
            label="Remaining"
            value={displayCount > displayGoal ? 'Limit exceeded!' : (displayRemaining > 0 ? displayRemaining.toString() : 'Goal reached!')}
            accentColor={displayCount > displayGoal ? COLORS.error : (displayRemaining > 0 ? COLORS.textSecondary : COLORS.success)}
          />
          <StatCard
            label="Weekly Total"
            value={weeklyTotal.toString()}
            accentColor={COLORS.abc}
          />
        </View>
      </Card>

      {/* This week */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={`${weeklyTotal} total`} />
        <BarChart
          data={thisWeekData.map(d => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.count,
            valueLabel: d.count > 0 ? d.count.toString() : '',
            goalMet: d.goal_met,
          }))}
          maxValue={Math.max(dailyGoal, highCount, 1)}
          accentColor={COLORS.abc}
          selectedIndex={selectedBar?.chartId === 'week' ? selectedBar.barIndex : undefined}
          onBarPress={(i) => handleBarPress('week', i, thisWeekData)}
        />
      </Card>

      {/* Weekly graphs for current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d: DayAbc) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.count,
              valueLabel: d.count > 0 ? d.count.toString() : '',
              goalMet: d.goal_met,
            }))}
            maxValue={Math.max(dailyGoal, highCount, 1)}
            accentColor={COLORS.abc}
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
          <StatCard label="Total" value={selectedStats.total.toString()} accentColor={COLORS.abc} />
          <StatCard label="Daily Avg" value={selectedStats.avg.toString()} accentColor={COLORS.abc} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Most" value={selectedStats.most.toString()} accentColor={COLORS.success} />
          <StatCard label="Least" value={selectedStats.least > 0 ? selectedStats.least.toString() : '—'} accentColor={COLORS.textSecondary} />
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
          <StatCard label="Daily Avg" value={avgCount.toString()} accentColor={COLORS.abc} />
          <StatCard label="Best Day" value={highCount.toString()} accentColor={COLORS.abc} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Lowest Day" value={lowCount > 0 ? lowCount.toString() : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Goal Streak" value={`${streak} days`} accentColor={streak > 0 ? COLORS.success : COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Days" value={`${goalDays} days`} accentColor={COLORS.abc} />
          <StatCard label="Monthly Tot" value={allDays.reduce((s, d) => s + d.count, 0).toString()} accentColor={COLORS.abc} />
        </View>
      </Card>
        </Animated.View>
      </ScrollView>
    </View>
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

function getTodayStr(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  return Array.from({ length: dayOfWeek + 1 }, (_, i) => {
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

function getWeeksInCurrentMonth(monthData: DayAbc[]) {
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

function calculateMonthStats(monthData: DayAbc[], dailyGoal: number) {
  const days = monthData.filter(d => d.count > 0);
  return {
    total: monthData.reduce((s, d) => s + d.count, 0),
    avg: days.length ? Math.round(monthData.reduce((s, d) => s + d.count, 0) / days.length) : 0,
    most: days.length ? Math.max(...days.map(d => d.count)) : 0,
    least: days.length ? Math.min(...days.map(d => d.count)) : 0,
    goalReached: monthData.filter(d => d.goal_met).length,
    goalMissed: days.length - monthData.filter(d => d.goal_met).length,
  };
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m - 1, d).getDay()];
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

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
    backgroundColor: COLORS.abc,
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
