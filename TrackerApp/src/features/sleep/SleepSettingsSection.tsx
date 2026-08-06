import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch, Platform, Keyboard } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';
import { Moon, Clock } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { TimePickerModal } from '../../components/ui/TimePickerModal';
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
  const isFocused = useIsFocused();
  const { goalMinutes } = useSleepStore();

  const goalHours = Math.floor(goalMinutes / 60);
  const goalMins = goalMinutes % 60;

  const [goalHoursInput, setGoalHoursInput] = useState(goalHours.toString());
  const [goalMinsInput, setGoalMinsInput] = useState(goalMins.toString());
  const [isEditing, setIsEditing] = useState(false);
  
  // Reminder settings
  const [reminderSettings, setReminderSettings] = useState<SleepReminderSettings>({
    bedtimeEnabled: false,
    bedtimeHour: 22,
    bedtimeMinute: 0,
    wakeEnabled: false,
    wakeHour: 7,
    wakeMinute: 0,
  });
  const [showBedtimePicker, setShowBedtimePicker] = useState(false);
  const [showWakePicker, setShowWakePicker] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Load reminder settings every time screen is focused
  useEffect(() => {
    if (!isFocused) return;
    
    async function loadSettings() {
      try {
        const settings = await loadSleepReminderSettings(db);
        setReminderSettings(settings);
        setIsInitialized(true);
      } catch (error) {
        setIsInitialized(true);
      }
    }
    loadSettings();
  }, [isFocused, db]);

  async function handleSaveGoal() {
    Keyboard.dismiss();
    const hours = parseInt(goalHoursInput, 10) || 0;
    const mins = parseInt(goalMinsInput, 10) || 0;
    const totalMins = hours * 60 + mins;

    if (totalMins < 60 || totalMins > 840) {
      setGoalHoursInput(goalHours.toString());
      setGoalMinsInput(goalMins.toString());
      setIsEditing(false);
      return;
    }

    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('sleep_goal_mins', ?)`,
        [totalMins.toString()]
      );
      useSleepStore.setState({ goalMinutes: totalMins });
      setIsEditing(false);
    } catch (error) {
    }
  }

  function handleCancelEdit() {
    setGoalHoursInput(goalHours.toString());
    setGoalMinsInput(goalMins.toString());
    setIsEditing(false);
  }

  async function handleToggleBedtimeReminder(enabled: boolean) {
    const updated = { ...reminderSettings, bedtimeEnabled: enabled };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      await applySleepReminderSettings(updated);
    } catch (error) {
      setReminderSettings(reminderSettings);
    }
  }

  async function handleToggleWakeReminder(enabled: boolean) {
    const updated = { ...reminderSettings, wakeEnabled: enabled };
    setReminderSettings(updated);
    
    try {
      await saveSleepReminderSettings(db, updated);
      await applySleepReminderSettings(updated);
    } catch (error) {
      setReminderSettings(reminderSettings);
    }
  }

  async function handleBedtimeTimeChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowBedtimePicker(false);
      
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    
    if (!selectedDate) return;
    
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
    }
  }

  async function handleWakeTimeChange(event: any, selectedDate?: Date) {
    if (Platform.OS === 'android') {
      setShowWakePicker(false);
      
      if (event.type === 'dismissed') {
        return; // User cancelled
      }
    }
    
    if (!selectedDate) return;
    
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
    }
  }

  function formatTime(hour: number, minute: number): string {
    if (typeof hour !== 'number' || typeof minute !== 'number') {
      return '12:00 AM';
    }
    const h = hour % 12 || 12;
    const m = minute.toString().padStart(2, '0');
    const period = hour >= 12 ? 'PM' : 'AM';
    return `${h}:${m} ${period}`;
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
            <View style={styles.editCol}>
              <View style={styles.editRow}>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    value={goalHoursInput}
                    onChangeText={setGoalHoursInput}
                    keyboardType="number-pad"
                    placeholder="7"
                    style={styles.timeInput}
                    autoFocus
                  />
                  <Text style={styles.unit}>h</Text>
                </View>
                <View style={styles.timeInputGroup}>
                  <TextInput
                    value={goalMinsInput}
                    onChangeText={setGoalMinsInput}
                    keyboardType="number-pad"
                    placeholder="30"
                    style={styles.timeInput}
                  />
                  <Text style={styles.unit}>m</Text>
                </View>
              </View>
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
              disabled={!isInitialized}
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
              disabled={!isInitialized}
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
      <TimePickerModal
        key={`bedtime-${showBedtimePicker}`}
        visible={showBedtimePicker}
        hour={reminderSettings.bedtimeHour}
        minute={reminderSettings.bedtimeMinute}
        title="Bedtime"
        accentColor={COLORS.sleep}
        onConfirm={(hour, minute) => {
          setShowBedtimePicker(false);
          handleBedtimeTimeChange({ type: 'set' }, new Date(0, 0, 0, hour, minute));
        }}
        onCancel={() => setShowBedtimePicker(false)}
      />

      <TimePickerModal
        key={`wake-${showWakePicker}`}
        visible={showWakePicker}
        hour={reminderSettings.wakeHour}
        minute={reminderSettings.wakeMinute}
        title="Wake Up"
        accentColor={COLORS.sleep}
        onConfirm={(hour, minute) => {
          setShowWakePicker(false);
          handleWakeTimeChange({ type: 'set' }, new Date(0, 0, 0, hour, minute));
        }}
        onCancel={() => setShowWakePicker(false)}
      />

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
    gap: 14,   
    flexWrap: 'wrap',
  },
  editCol: {
    gap: SPACING.sm,
  },
  timeInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  timeInput: {
    width: 70,
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
