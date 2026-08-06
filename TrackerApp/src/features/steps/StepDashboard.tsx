import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useStepStore, hydrateStepStore } from '../../stores/stepStore';
import { Card } from '../../components/ui/Card';
import { StatCard } from '../../components/ui/StatCard';
import { BarChart } from './BarChart';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function StepDashboard() {
  const db = useSQLiteContext();
  const { todaySteps, todayDistance, todayCalories, dailyGoal, weeklyData, monthlyData } = useStepStore();
  const tabBarHeight = useBottomTabBarHeight();
  
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  useEffect(() => { hydrateStepStore(db); }, []);

  // Add today's data
  const today = new Date().toISOString().split('T')[0];
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
  const [selectedMonthData, setSelectedMonthData] = useState<any[]>([]);
  
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
      console.error('Failed to load month data:', error);
      setSelectedMonthData([]);
    }
  }
  
  const selectedMonthStats = calculateMonthStats(selectedMonthData, dailyGoal);

  // ── Computed stats (for Stats card - all time) ───────────────────────────
  const allDays = currentMonthData.filter(d => d.steps > 0);
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
  
  function goToPreviousMonth() {
    setSelectedMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }
  
  function goToNextMonth() {
    const today = new Date();
    const nextMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    if (nextMonth <= today) {
      setSelectedMonth(nextMonth);
    }
  }
  
  const canGoNext = selectedMonth.getMonth() < new Date().getMonth() || selectedMonth.getFullYear() < new Date().getFullYear();

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
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

      {/* This week graph */}
      <Card style={styles.section}>
        <SectionTitle title="This Week" sub={`${weeklyTotal.toLocaleString()} total steps`} />
        <BarChart
          data={thisWeekData.map((d) => ({
            label: formatDay(d.date),
            topLabel: formatDate(d.date),
            value: d.steps || 0,
            valueLabel: d.steps > 0 ? (d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps.toString()) : '',
            goalMet: d.goal_met || false,
          }))}
          maxValue={Math.max(dailyGoal, highSteps, 1)}
          accentColor={COLORS.steps}
        />
      </Card>

      {/* All weeks in current month */}
      {weeksInMonth.map((week, index) => (
        <Card key={index} style={styles.section}>
          <SectionTitle title={`Week ${index + 1}`} sub={week.dateRange} />
          <BarChart
            data={week.data.map((d) => ({
              label: formatDay(d.date),
              topLabel: formatDate(d.date),
              value: d.steps || 0,
              valueLabel: d.steps > 0 ? (d.steps >= 1000 ? `${(d.steps / 1000).toFixed(1)}k` : d.steps.toString()) : '',
              goalMet: d.goal_met || false,
            }))}
            maxValue={Math.max(dailyGoal, highSteps, 1)}
            accentColor={COLORS.steps}
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

/**
 * Get this week's data (Sunday to Saturday)
 * Fills in empty days with 0 values
 */
function getThisWeekData(weeklyData: any[], todayRecord: any) {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Calculate Sunday of this week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dayOfWeek);
  
  const week = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Find existing data or use todayRecord or create empty
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
function getCurrentMonthData(monthlyData: any[], todayRecord: any) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-indexed (0 = January, 7 = August)
  
  // Filter out any data not from current month
  const currentMonthOnly = monthlyData.filter(d => {
    const recordDate = new Date(d.date + 'T12:00:00');
    return recordDate.getMonth() === month && recordDate.getFullYear() === year;
  });
  
  console.log('📅 Current month data:', {
    totalRecords: monthlyData.length,
    filteredRecords: currentMonthOnly.length,
    dates: currentMonthOnly.map(d => d.date),
  });
  
  const monthData = [];
  
  // Build array from day 1 to today
  for (let day = 1; day <= today.getDate(); day++) {
    // Create date string manually to avoid timezone issues
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    console.log(`Creating date for day ${day}:`, { dateStr });
    
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
  
  console.log('📊 Final monthData dates:', monthData.map(d => d.date));
  
  return monthData;
}

/**
 * Calculate month statistics
 */
function calculateMonthStats(monthData: any[], dailyGoal: number) {
  const daysWithSteps = monthData.filter(d => d.steps > 0);
  
  return {
    totalSteps: monthData.reduce((sum, d) => sum + d.steps, 0),
    avgSteps: daysWithSteps.length > 0 
      ? Math.round(monthData.reduce((sum, d) => sum + d.steps, 0) / daysWithSteps.length)
      : 0,
    mostSteps: daysWithSteps.length > 0 ? Math.max(...monthData.map(d => d.steps)) : 0,
    leastSteps: daysWithSteps.length > 0 ? Math.min(...daysWithSteps.map(d => d.steps)) : 0,
    goalReached: monthData.filter(d => d.goal_met).length,
    goalMissed: daysWithSteps.length - monthData.filter(d => d.goal_met).length,
  };
}

/**
 * Get all weeks in current month
 * Week 1 starts from day 1, then every 7 days after
 */
function getWeeksInCurrentMonth(monthData: any[]) {
  if (monthData.length === 0) return [];
  
  // Use the actual data dates instead of reconstructing them
  const weeks: any[] = [];
  let weekNumber = 1;
  
  for (let i = 0; i < monthData.length; i += 7) {
    const weekData = monthData.slice(i, i + 7);
    if (weekData.length === 0) continue;
    
    const firstDate = weekData[0].date;
    const lastDate = weekData[weekData.length - 1].date;
    
    // Parse dates properly
    const [startYear, startMonth, startDay] = firstDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = lastDate.split('-').map(Number);
    
    const startDate = new Date(startYear, startMonth - 1, startDay);
    const endDate = new Date(endYear, endMonth - 1, endDay);
    
    const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    
    console.log(`Week ${weekNumber}:`, {
      firstDate,
      lastDate,
      dateRange,
    });
    
    weeks.push({
      data: weekData,
      dateRange,
      weekNumber: weekNumber,
    });
    
    weekNumber++;
  }
  
  return weeks;
}

async function getMonthData(db: any, month: Date, todayRecord: any) {
  // NOT USED ANYMORE
  return [];
}

function getThisMonthData(monthlyData: any[], todayRecord: any) {
  // NOT USED ANYMORE  
  return [];
}

function formatDay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatMonthDay(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
}

const styles = StyleSheet.create({
  scroll:  { flex: 1 },
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
