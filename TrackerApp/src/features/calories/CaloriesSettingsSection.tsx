import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';
import { Flame, Clock } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { TimePickerModal } from '../../components/ui/TimePickerModal';
import { useUserStore } from '../../stores/userStore';
import {
  loadWorkoutReminderSettings,
  saveWorkoutReminderSettings,
  applyWorkoutReminderSettings,
  type WorkoutReminderSettings,
} from '../../lib/workoutReminders';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function CaloriesSettingsSection() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { profile } = useUserStore();

  const [gymEnabled, setGymEnabled] = useState(!!(profile?.uses_gym));
  const [reminderSettings, setReminderSettings] = useState<WorkoutReminderSettings>({
    enabled: false,
    hour: 18,
    minute: 0,
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!isFocused) return;
    async function loadSettings() {
      try {
        const settings = await loadWorkoutReminderSettings(db);
        setReminderSettings(settings);
        setIsInitialized(true);
      } catch (error) {
        setIsInitialized(true);
      }
    }
    loadSettings();
  }, [isFocused, db]);

  async function handleGymToggle(enabled: boolean) {
    setGymEnabled(enabled);
    if (!enabled) {
      const updated = { ...reminderSettings, enabled: false };
      setReminderSettings(updated);
      try {
        await saveWorkoutReminderSettings(db, updated);
        await applyWorkoutReminderSettings(updated);
      } catch (e) {
      }
    }

    try {
      await db.runAsync(
        'UPDATE user_profile SET uses_gym = ?, updated_at = ? WHERE id = 1',
        [enabled ? 1 : 0, new Date().toISOString()]
      );
      if (profile) {
        useUserStore.getState().setProfile({ ...profile, uses_gym: enabled });
      }
    } catch (e) {
      setGymEnabled(!enabled);
    }
  }

  async function handleToggleReminder(enabled: boolean) {
    const updated = { ...reminderSettings, enabled };
    setReminderSettings(updated);
    try {
      await saveWorkoutReminderSettings(db, updated);
      await applyWorkoutReminderSettings(updated);
    } catch (error) {
      setReminderSettings(reminderSettings);
    }
  }

  async function handleTimeChange(hour: number, minute: number) {
    setShowTimePicker(false);
    const updated = { ...reminderSettings, hour, minute };
    setReminderSettings(updated);
    try {
      await saveWorkoutReminderSettings(db, updated);
      if (updated.enabled) {
        await applyWorkoutReminderSettings(updated);
      }
    } catch (error) {
    }
  }

  function formatTime(hour: number, minute: number): string {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${period}`;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Flame size={20} color={COLORS.calories} />
        <Text style={styles.title}>Calories</Text>
      </View>

      <Card style={styles.card}>
        {/* Gym tracking */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Gym Tracking</Text>
              <Text style={styles.description}>
                Enable workout logging features
              </Text>
            </View>
            <Switch
              value={gymEnabled}
              onValueChange={handleGymToggle}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.calories }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>

        {/* Workout reminder */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Workout Reminder</Text>
              <Text style={styles.description}>
                Daily reminder to log your workout
              </Text>
            </View>
            <Switch
              value={reminderSettings.enabled}
              onValueChange={handleToggleReminder}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.calories }}
              thumbColor={COLORS.textPrimary}
              disabled={!gymEnabled || !isInitialized}
            />
          </View>

          {reminderSettings.enabled && gymEnabled && (
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowTimePicker(true)}
            >
              <Clock size={16} color={COLORS.calories} />
              <Text style={styles.timeButtonText}>
                {formatTime(reminderSettings.hour, reminderSettings.minute)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      <TimePickerModal
        key={`workout-${showTimePicker}`}
        visible={showTimePicker}
        hour={reminderSettings.hour}
        minute={reminderSettings.minute}
        title="Workout Reminder"
        accentColor={COLORS.calories}
        onConfirm={handleTimeChange}
        onCancel={() => setShowTimePicker(false)}
      />

      <Text style={styles.note}>
        Walking calories are calculated automatically from your step count.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: SPACING.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  card: { gap: SPACING.xl },
  section: { gap: SPACING.sm },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  description: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  settingInfo: { flex: 1 },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.calories,
    backgroundColor: `${COLORS.calories}10`,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  timeButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.calories,
  },
  note: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
