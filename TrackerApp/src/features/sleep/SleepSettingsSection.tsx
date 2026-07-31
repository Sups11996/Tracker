import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Moon } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useSleepStore } from '../../stores/sleepStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function SleepSettingsSection() {
  const db = useSQLiteContext();
  const { goalMinutes } = useSleepStore();

  const goalHours = Math.floor(goalMinutes / 60);
  const goalMins = goalMinutes % 60;

  const [goalInput, setGoalInput] = useState(goalHours.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [bedtimeReminder, setBedtimeReminder] = useState(false);
  const [wakeReminder, setWakeReminder] = useState(false);

  async function handleSaveGoal() {
    const hours = parseFloat(goalInput);
    if (isNaN(hours) || hours < 1 || hours > 14) {
      setGoalInput(goalHours.toString());
      setIsEditing(false);
      return;
    }

    const newGoalMins = Math.round(hours * 60);

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('sleep_goal_mins', ?)`,
        [newGoalMins.toString()]
      );
      useSleepStore.setState({ goalMinutes: newGoalMins });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save sleep goal:', error);
    }
  }

  function handleCancelEdit() {
    setGoalInput(goalHours.toString());
    setIsEditing(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Moon size={20} color={COLORS.sleep} />
        <Text style={styles.title}>Sleep</Text>
      </View>

      <Card style={styles.card}>
        {/* Sleep Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sleep Goal</Text>

          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="decimal-pad"
                placeholder="e.g. 8"
                style={styles.input}
                autoFocus
              />
              <Text style={styles.unit}>hours</Text>
              <View style={styles.editActions}>
                <Button
                  label="Save"
                  onPress={handleSaveGoal}
                  variant="primary"
                  accentColor={COLORS.sleep}
                  size="sm"
                />
                <Button
                  label="Cancel"
                  onPress={handleCancelEdit}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </View>
          ) : (
            <View style={styles.row}>
              <Text style={styles.value}>
                {goalHours}h{goalMins > 0 ? ` ${goalMins}m` : ''}
              </Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Bedtime Reminder */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Bedtime Reminder</Text>
              <Text style={styles.description}>
                Remind me when it's time to sleep
              </Text>
            </View>
            <Switch
              value={bedtimeReminder}
              onValueChange={setBedtimeReminder}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.sleep }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>

        {/* Wake Reminder */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Wake Up Reminder</Text>
              <Text style={styles.description}>
                Remind me to log sleep when I wake up
              </Text>
            </View>
            <Switch
              value={wakeReminder}
              onValueChange={setWakeReminder}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.sleep }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>
      </Card>

      <Text style={styles.note}>
        Reminder times can be configured after enabling.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
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
  card: {
    gap: SPACING.xl,
  },
  section: {
    gap: SPACING.sm,
  },
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
  settingInfo: {
    flex: 1,
  },
  value: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  editButton: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.sleep,
  },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  input: {
    flex: 1,
    minWidth: 80,
  },
  unit: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  note: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
});
