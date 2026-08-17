import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Flame, Plus } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { WorkoutLogModal } from './WorkoutLogModal';
import {
  useCaloriesStore,
  hydrateCaloriesStore,
  logWorkout,
  type Intensity,
} from '../../stores/caloriesStore';
import { useStepStore } from '../../stores/stepStore';
import { useUserStore } from '../../stores/userStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

interface CaloriesHomeCardProps {
  onPress?: () => void;
}

export function CaloriesHomeCard({ onPress }: CaloriesHomeCardProps) {
  const db = useSQLiteContext();
  const { totalCalories, walkingCalories, workoutCalories, workoutLogs } = useCaloriesStore();
  const { todayCalories: stepCal } = useStepStore();
  const { profile } = useUserStore();
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    hydrateCaloriesStore(db);
  }, []);

  // Keep walking calories in sync with step store
  useEffect(() => {
    useCaloriesStore.getState().setWalkingCalories(stepCal);
  }, [stepCal]);

  async function handleSaveWorkout(durationMins: number, intensity: Intensity, note: string, customCalories?: number) {
    try {
      await logWorkout(db, durationMins, intensity, profile?.weight_kg ?? 70, note, customCalories);
      setShowModal(false);
    } catch (e) {
    }
  }

  return (
    <>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <Card style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Flame size={18} color={COLORS.calories} />
              <Text style={styles.title}>Calories</Text>
            </View>
            <Text style={styles.total}>{totalCalories} <Text style={styles.unit}>kcal</Text></Text>
          </View>

          {/* Breakdown */}
          <View style={styles.breakdown}>
            <BreakdownRow
              label="Walking"
              value={Math.round(walkingCalories)}
              color={COLORS.steps}
            />
            <BreakdownRow
              label="Workout"
              value={Math.round(workoutCalories)}
              color={COLORS.calories}
            />
          </View>

          {/* Today's workouts */}
          {workoutLogs.length > 0 && (
            <View style={styles.logs}>
              {workoutLogs.slice(-2).map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={styles.logText}>
                    {log.duration_mins}min {log.intensity}
                    {log.note ? ` · ${log.note}` : ''}
                  </Text>
                  <Text style={styles.logCal}>{log.calories} kcal</Text>
                </View>
              ))}
            </View>
          )}

          {/* Log workout button */}
          <TouchableOpacity
            style={styles.logBtn}
            onPress={() => setShowModal(true)}
            activeOpacity={0.7}
          >
            <Plus size={16} color={COLORS.calories} />
            <Text style={styles.logBtnText}>Log Workout</Text>
          </TouchableOpacity>
        </Card>
      </TouchableOpacity>

      <WorkoutLogModal
        visible={showModal}
        weightKg={profile?.weight_kg ?? 70}
        onSave={handleSaveWorkout}
        onCancel={() => setShowModal(false)}
      />
    </>
  );
}

function BreakdownRow({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.breakdownRow}>
      <View style={[styles.breakdownDot, { backgroundColor: color }]} />
      <Text style={styles.breakdownLabel}>{label}</Text>
      <Text style={[styles.breakdownValue, { color }]}>{value} kcal</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  total: {
    fontSize: TYPOGRAPHY.size.xl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.calories,
  },
  unit: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.regular,
    color: COLORS.textMuted,
  },
  breakdown: { gap: SPACING.xs },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  breakdownValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  logs: {
    gap: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    paddingTop: SPACING.sm,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  logText: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    flex: 1,
  },
  logCal: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.calories,
  },
  logBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.calories,
    backgroundColor: `${COLORS.calories}15`,
  },
  logBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.calories,
  },
});
