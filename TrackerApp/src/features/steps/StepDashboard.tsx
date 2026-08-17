import React, { useEffect, useState, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Animated, Easing } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useStepStore, hydrateStepStore } from '../../stores/stepStore';
import { getTodayLocal } from '../../lib/dateUtils';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from './BarChart';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface DayStepData {
  date: string;
  steps: number;
  distance_m: number;
  calories: number;
  goal: number;
  goal_met: boolean;
}

interface WeekGroup {
  data: DayStepData[];
  dateRange: string;
  weekNumber: number;
}

export function StepDashboard() {
  const db = useSQLiteContext();
  const { todaySteps, todayDistance, todayCalories, dailyGoal, weeklyData, monthlyData } = useStepStore();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Animation
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  // Selected bar state: { date, steps, goal, chartId, barIndex }
  // chartId distinguishes which chart the bar belongs to ('week' | 'month-0' | 'month-1' ...)
  const [selectedBar, setSelectedBar] = useState<{
    date: string;
    steps: number;
    distance_m: number;
    goal: number;
    chartId: string;
    barIndex: number;
  } | null>(null);

  useEffect(() => {
    hydrateStepStore(db);
    // Short delay for animation
    setTimeout(() => setIsLoading(false), 200);
  }, []);

  const refreshThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Refresh historical data when today's steps change, throttled to once per 60s
  useEffect(() => {
    if (isLoading) return;
    if (refreshThrottleRef.current) return; // already scheduled
    refreshThrottleRef.current = setTimeout(() => {
      refreshHistoricalData();
      refreshThrottleRef.current = null;
    }, 60000);
    return () => {
      if (refreshThrottleRef.current) {
        clearTimeout(refreshThrottleRef.current);
        refreshThrottleRef.current = null;
      }
    };
  }, [todaySteps, db]);

  async function refreshHistoricalData() {
    try {
      const today = getTodayLocal();
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const startOfWeek = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`;
      
      const weekly = await db.getAllAsync<any>(
        `SELECT * FROM daily_steps
         WHERE date >= ? AND date <= ?
         ORDER BY date ASC`,
        [startOfWeek, today]
      );

      const currentDate = new Date();
      const startOfMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      
      const monthly = await db.getAllAsync<any>(
        `SELECT * FROM daily_steps
         WHERE date >= ? AND date <= ?
         ORDER BY date ASC`,
        [startOfMonth, today]
      );

      // Update just the historical data without full hydration
      useStepStore.setState({ 
        weeklyData: weekly, 
        monthlyData: monthly 
      });
    } catch (error) {
      // Silent fail - historical data refresh is not critical
    }
  }

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

  // Add today's data
  const today = getTodayLocal();  // Use local timezone instead of UTC
  const todayRecord = {
    date: today,
    steps: todaySteps,
    distance_m: todayDistance,
    calories: todayCalories,
    goal: dailyGoal,
    goal_met: todaySteps >= dailyGoal,
  };

  // ─── THIS WEEK (Sunday to Saturday) ───────────────────────────────────────
  const thisWeekData = getThisWeekData(weeklyData, todayRecord);
  const weeklyTotal = thisWeekData.reduce((s, d) => s + (d.steps || 0), 0);

  // ─── CURRENT MONTH DATA ──────────────────────────────────────────────────
  const currentMonthData = getCurrentMonthData(monthlyData, todayRecord);
  
  // ─── ALL WEEKS IN CURRENT MONTH ────────────────────────────────────────────
  const weeksInMonth = getWeeksInCurrentMonth(currentMonthData);

  // ─── SELECTED MONTH DATA (for month selector) ─────────────────────────────
  const [selectedMonthData, setSelectedMonthData] = useState<DayStepData[]>([]);
  
  useEffect(() => {
    loadMonthData(selectedMonth);
  }, [selectedMonth, db]);
  
  async function loadMonthData(month: Date) {
    try {
      const year = month.getFullYear();
      const monthIndex = month.getMonth();
      const firstDay = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, monthIndex + 1, 0).getDate();
      const lastDayStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const data = await db.getAllAsync<any>(
        `SELECT * FROM daily_steps
         WHERE date >= ? AND date <= ?
         ORDER BY date ASC`,
        [firstDay, lastDayStr]
      );
      
      setSelectedMonthData(data || []);
    } catch (error) {
      setSelectedMonthData([]);
    }
  }
  
  const selectedMonthStats = calculateMonthStats(selectedMonthData, dailyGoal);

  // ── Computed stats ───────────────────────────────────────────────────────
  const allDays = currentMonthData.filter(d => d.steps > 0);
  const avgSteps  = allDays.length ? Math.round(allDays.reduce((s, d) => s + d.steps, 0) / allDays.length) : 0;
  const highSteps = allDays.length ? Math.max(...allDays.map((d) => d.steps)) : 0;
  const lowSteps  = allDays.filter((d) => d.steps > 0).length ? Math.min(...allDays.filter((d) => d.steps > 0).map((d) => d.steps)) : 0;
  const goalDays  = allDays.filter((d) => d.goal_met).length;
  const totalDist = allDays.reduce((s, d) => s + d.distance_m, 0);
  const totalCal  = allDays.reduce((s, d) => s + d.calories, 0);
  
  function goToPreviousMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  
  function goToNextMonth() {
    const today = new Date();
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= today) setSelectedMonth(nextMonth);
  }
  
  const canGoNext = selectedMonth.getMonth() < new Date().getMonth() || selectedMonth.getFullYear() < new Date().getFullYear();

  // ── Bar tap handler ────────────────────────────────────────────────────────
  function handleBarPress(chartId: string, barIndex: number, data: DayStepData[]) {
    // If tapping the same bar again → deselect
    if (selectedBar?.chartId === chartId && selectedBar?.barIndex === barIndex) {
      setSelectedBar(null);
      return;
    }
    const d = data[barIndex];
    if (!d) return;
    setSelectedBar({ date: d.date, steps: d.steps || 0, distance_m: d.distance_m || 0, goal: d.goal || dailyGoal, chartId, barIndex });
  }

  // ── Display values for the top card ───────────────────────────────────────
  const displaySteps    = selectedBar ? selectedBar.steps : todaySteps;
  const displayGoal     = selectedBar ? selectedBar.goal  : dailyGoal;
  const displayDate     = selectedBar ? selectedBar.date  : today;
  const displayProgress = displayGoal > 0 ? Math.min(100, Math.round((displaySteps / displayGoal) * 100)) : 0;
  const displayRemaining = Math.max(0, displayGoal - displaySteps);
  const isToday         = displayDate === today;
  const cardTitle       = isToday ? 'Today' : formatDate(displayDate) + ' · ' + formatDay(displayDate);

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
        {/* Today / Selected day overview */}
      <Card style={styles.section}>
        <SectionTitle title={cardTitle} />
        <View style={styles.statRow}>
          <StatCard
            label="Steps"
            value={displaySteps.toLocaleString()}
            sub={`Goal: ${displayGoal.toLocaleString()}`}
            accentColor={COLORS.steps}
          />
          <StatCard
            label="Progress"
            value={`${displayProgress}%`}
            accentColor={COLORS.steps}
          />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard
            label="Remaining"
            value={displayRemaining > 0 ? displayRemaining.toLocaleString() : 'Goal reached!'}
            accentColor={displayRemaining > 0 ? COLORS.textSecondary : COLORS.success}
          />
          <StatCard
            label="Distance"
            value={selectedBar
              ? `${(selectedBar.distance_m / 1000).toFixed(2)} km`
              : `${(todayDistance / 1000).toFixed(2)} km`}
            accentColor={COLORS.steps}
          />
        </View>
      </Card>

      {/* This week graph */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={`${weeklyTotal.toLocaleString()} total steps`} />
        <BarChart
          data={thisWeekData.map((d) => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.steps || 0,
            valueLabel: d.steps > 0 ? (d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps.toString()) : '',
            goalMet: d.steps >= (d.goal || dailyGoal) && d.steps > 0,
          }))}
          maxValue={Math.max(thisWeekData.length > 0 ? Math.max(...thisWeekData.map(d => d.goal || dailyGoal)) : dailyGoal, todaySteps, highSteps, 1)}
          accentColor={COLORS.steps}
          selectedIndex={selectedBar?.chartId === 'week' ? selectedBar.barIndex : undefined}
          onBarPress={(i) => handleBarPress('week', i, thisWeekData)}
        />
      </Card>

      {/* All weeks in current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d: DayStepData) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.steps || 0,
              valueLabel: d.steps > 0 ? (d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps.toString()) : '',
              goalMet: d.steps >= (d.goal || dailyGoal) && d.steps > 0,
            }))}
            maxValue={Math.max(week.data.length > 0 ? Math.max(...week.data.map((d: DayStepData) => d.goal || dailyGoal)) : dailyGoal, highSteps, 1)}
            accentColor={COLORS.steps}
            selectedIndex={selectedBar?.chartId === `month-${index}` ? selectedBar.barIndex : undefined}
            onBarPress={(i) => handleBarPress(`month-${index}`, i, week.data)}
          />
        </Card>
      ))}

      {/* Month selector with stats */}
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
          <StatCard label="Total Steps" value={selectedMonthStats.totalSteps.toLocaleString()} accentColor={COLORS.steps} />
          <StatCard label="Daily Avg" value={selectedMonthStats.avgSteps.toLocaleString()} accentColor={COLORS.steps} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Most Steps" value={selectedMonthStats.mostSteps.toLocaleString()} accentColor={COLORS.success} />
          <StatCard label="Least Steps" value={selectedMonthStats.leastSteps > 0 ? selectedMonthStats.leastSteps.toLocaleString() : '—'} accentColor={COLORS.textSecondary} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Goal Reached" value={`${selectedMonthStats.goalReached} days`} accentColor={COLORS.success} />
          <StatCard label="Goal Missed" value={`${selectedMonthStats.goalMissed} days`} accentColor={COLORS.error} />
        </View>
      </Card>

      {/* Stats grid */}
      <Card style={styles.section}>
        <SectionTitle title="Stats" />
        <View style={styles.statRow}>
          <StatCard label="Daily Avg"    value={avgSteps.toLocaleString()}  accentColor={COLORS.steps} />
          <StatCard label="Best Day"     value={highSteps.toLocaleString()} accentColor={COLORS.steps} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Lowest Day"   value={lowSteps > 0 ? lowSteps.toLocaleString() : '—'} accentColor={COLORS.textSecondary} />
          <StatCard label="Goal Days"    value={`${goalDays} days`}           accentColor={COLORS.steps} />
        </View>
        <View style={[styles.statRow, { marginTop: SPACING.sm }]}>
          <StatCard label="Total Dist"   value={`${(totalDist / 1000).toFixed(1)} km`} accentColor={COLORS.steps} />
          <StatCard label="Total Cal"    value={`${Math.round(totalCal)} kcal`} accentColor={COLORS.calories} />
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

/**
 * Get this week's data (Sunday to today only — no future days)
 * Fills in empty past days with 0 values
 */
function getThisWeekData(weeklyData: DayStepData[], todayRecord: DayStepData) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate Sunday of this week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  
  const week = [];
  // Only go up to today (dayOfWeek + 1 days: Sun=1, Mon=2, ... Fri=6)
  for (let i = 0; i <= dayOfWeek; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    let dayData = weeklyData.find(d => d.date === dateStr);
    if (!dayData && dateStr === todayRecord.date) {
      dayData = todayRecord;
    }
    if (!dayData) {
      dayData = {
        date: dateStr,
        steps: 0,
        distance_m: 0,
        calories: 0,
        goal: todayRecord.goal,
        goal_met: false,
      };
    }
    week.push(dayData);
  }
  
  return week;
}

/**
 * Get current month's data (from day 1 to today) - ONLY current month
 */
function getCurrentMonthData(monthlyData: DayStepData[], todayRecord: DayStepData) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = January, 7 = August)
  
  // Filter out any data not from current month
  const currentMonthOnly = monthlyData.filter(d => {
    const [y, m] = d.date.split('-').map(Number);
    return m === month + 1 && y === year;
  });
  
  const monthData = [];
  
  // Build array from day 1 to today
  for (let day = 1; day <= today.getDate(); day++) {
    // Create date string manually to avoid timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    
    // Only find data that matches this exact date
    let dayData = currentMonthOnly.find(d => d.date === dateStr);
    if (!dayData && dateStr === todayRecord.date) {
      dayData = todayRecord;
    }
    if (!dayData) {
      dayData = {
        date: dateStr,
        steps: 0,
        distance_m: 0,
        calories: 0,
        goal: todayRecord.goal,
        goal_met: false,
      };
    }
    monthData.push(dayData);
  }
  
  
  return monthData;
}

/**
 * Calculate month statistics
 */
function calculateMonthStats(monthData: DayStepData[], dailyGoal: number) {
  const daysWithSteps = monthData.filter(d => d.steps > 0);
  // Divide by total calendar days (monthData.length) not just active days,
  // so "Daily Avg" means average per calendar day
  const totalSteps = monthData.reduce((sum, d) => sum + d.steps, 0);
  return {
    totalSteps,
    avgSteps: monthData.length > 0
      ? Math.round(totalSteps / monthData.length)
      : 0,
    mostSteps: daysWithSteps.length > 0 ? Math.max(...daysWithSteps.map(d => d.steps)) : 0,
    leastSteps: daysWithSteps.length > 0 ? Math.min(...daysWithSteps.map(d => d.steps)) : 0,
    goalReached: monthData.filter(d => d.goal_met).length,
    goalMissed: daysWithSteps.length - monthData.filter(d => d.goal_met).length,
  };
}

/**
 * Get all weeks in current month
 * Week 1 starts from day 1, then every 7 days after
 */
function getWeeksInCurrentMonth(monthData: DayStepData[]): WeekGroup[] {
  if (monthData.length === 0) return [];
  const weeks: WeekGroup[] = [];
  let weekNumber = 1;
  
  for (let i = 0; i < monthData.length; i += 7) {
    const weekData = monthData.slice(i, i + 7);
    if (weekData.length === 0) continue; // Skip if somehow empty
    
    const firstDate = weekData[0].date;
    const lastDate = weekData[weekData.length - 1].date;
    
    // Parse dates properly
    const [startYear, startMonth, startDay] = firstDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = lastDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    weeks.push({
      data: weekData,
      dateRange,
      weekNumber: weekNumber,
    });
    
    weekNumber++;
  }
  
  return weeks;
}

function formatDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(y, m - 1, d).getDay()];
}

function formatDate(date: string): string {
  const [, m, d] = date.split('-').map(Number);
  return `${m}/${d}`;
}

function formatMonthDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
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
    backgroundColor: COLORS.steps,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthButtonDisabled: {
    backgroundColor: COLORS.glass,
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
