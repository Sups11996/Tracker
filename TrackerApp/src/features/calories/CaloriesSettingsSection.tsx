import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Flame } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useUserStore } from '../../stores/userStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function CaloriesSettingsSection() {
  const db = useSQLiteContext();
  const { profile } = useUserStore();
  
  const [gymEnabled, setGymEnabled] = useState(!!(profile?.uses_gym));
  const [reminderEnabled, setReminderEnabled] = useState(false);

  async function handleGymToggle(enabled: boolean) {
    // Optimistically update UI first — cascade reminder off if gym goes off
    setGymEnabled(enabled);
    if (!enabled) setReminderEnabled(false);
    
    try {
      await db.runAsync(
        'UPDATE user_profile SET uses_gym = ?, updated_at = ? WHERE id = 1',
        [enabled ? 1 : 0, new Date().toISOString()]
      );
      
      if (profile) {
        useUserStore.getState().setProfile({ ...profile, uses_gym: enabled });
      }
    } catch (e) {
      console.error('Failed to update gym setting:', e);
      // Revert on error
      setGymEnabled(!enabled);
      if (!enabled) setReminderEnabled(true);
    }
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
                Daily reminder to log workouts (evening)
              </Text>
            </View>
            <Switch
              value={reminderEnabled}
              onValueChange={setReminderEnabled}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.calories }}
              thumbColor={COLORS.textPrimary}
              disabled={!gymEnabled}
            />
          </View>
        </View>
      </Card>

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
  note: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});