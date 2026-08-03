import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch, Modal, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Moon, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Card } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useSleepStore } from '../../stores/sleepStore';
import {
  loadSleepReminderSettings,
  saveSleepReminderSettings,
  applySleepReminderSettings,
  type SleepReminderSettings,
} from '../../lib/sleepReminders';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function SleepSettingsSection() {
  const db = useSQLiteContext();
  const { goalMinutes } = useSleepStore();

  const goalHours = Math.floor(goalMinutes / 60);
  const goalMins = goalMinutes % 60;

  const [goalInput, setGoalInput] = useState(goalHours.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState<SleepReminderSettings | null>(null);
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  
  // Load reminder settings on mount
  useEffect(() => {
    loadSleepReminderSettings(db).then(setReminderSettings);
  }, [db]);

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

  async function handleToggleBedtimeReminder(enabled: boolean) {
    if (!reminderSettings) return;
    
    const updated = { ...reminderSettings, bedtimeEnabled: enabled };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      await applySleepReminderSettings(updated);
    } catch (error) {
      console.error('Failed to update bedtime reminder:', error);
    }
  }

  async function handleToggleWakeReminder(enabled: boolean) {
    if (!reminderSettings) return;
    
    const updated = { ...reminderSettings, wakeEnabled: enabled };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      await applySleepReminderSettings(updated);
    } catch (error) {
      console.error('Failed to update wake reminder:', error);
    }
  }

  async function handleBedtimeTimeChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowBedtimePicker(false);
    }
    
    if (!reminderSettings || !selectedDate) return;
    
    const updated = {
      ...reminderSettings,
      bedtimeHour: selectedDate.getHours(),
      bedtimeMinute: selectedDate.getMinutes(),
    };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      if (updated.bedtimeEnabled) {
        await applySleepReminderSettings(updated);
      }
    } catch (error) {
      console.error('Failed to update bedtime time:', error);
    }
  }

  async function handleWakeTimeChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowWakePicker(false);
    }
    
    if (!reminderSettings || !selectedDate) return;
    
    const updated = {
      ...reminderSettings,
      wakeHour: selectedDate.getHours(),
      wakeMinute: selectedDate.getMinutes(),
    };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      if (updated.wakeEnabled) {
        await applySleepReminderSettings(updated);
      }
    } catch (error) {
      console.error('Failed to update wake time:', error);
    }
  }

  function formatTime(hour: number, minute: number): string {
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${period}`;
  }

  if (!reminderSettings) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Moon size={20} color={COLORS.sleep} />
          <Text style={styles.title}>Sleep</Text>
        </View>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Loading...</Text>
        </Card>
      </View>
    ); // Loading
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
              value={reminderSettings.bedtimeEnabled}
              onValueChange={handleToggleBedtimeReminder}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.sleep }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
          
          {reminderSettings.bedtimeEnabled && (
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowBedtimePicker(true)}
            >
              <Clock size={16} color={COLORS.sleep} />
              <Text style={styles.timeButtonText}>
                {formatTime(reminderSettings.bedtimeHour, reminderSettings.bedtimeMinute)}
              </Text>
            </TouchableOpacity>
          )}
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
              value={reminderSettings.wakeEnabled}
              onValueChange={handleToggleWakeReminder}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.sleep }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
          
          {reminderSettings.wakeEnabled && (
            <TouchableOpacity
              style={styles.timeButton}
              onPress={() => setShowWakePicker(true)}
            >
              <Clock size={16} color={COLORS.sleep} />
              <Text style={styles.timeButtonText}>
                {formatTime(reminderSettings.wakeHour, reminderSettings.wakeMinute)}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Card>

      {/* Time Pickers */}
      {showBedtimePicker && reminderSettings && (
        <DateTimePicker
          value={new Date(0, 0, 0, reminderSettings.bedtimeHour, reminderSettings.bedtimeMinute)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleBedtimeTimeChange}
        />
      )}

      {showWakePicker && reminderSettings && (
        <DateTimePicker
          value={new Date(0, 0, 0, reminderSettings.wakeHour, reminderSettings.wakeMinute)}
          mode="time"
          is24Hour={false}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleWakeTimeChange}
        />
      )}

      <Text style={styles.note}>
        Notifications will be sent daily at the configured times.
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
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.sleep,
    backgroundColor: `${COLORS.sleep}10`,
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
  },
  timeButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.sleep,
  },
});
