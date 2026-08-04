import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Switch, Platform, NativeModules } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Footprints } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { TextInput } from '../../components/ui/TextInput';
import { Button } from '../../components/ui/Button';
import { useStepStore } from '../../stores/stepStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

const StepServiceModule = Platform.OS === 'android' ? NativeModules.StepServiceModule : null;

export function StepSettingsSection() {
  const db = useSQLiteContext();
  const { dailyGoal, status } = useStepStore();
  
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());
  const [isEditing, setIsEditing] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(status !== 'unavailable');

  async function handleSaveGoal() {
    const newGoal = parseInt(goalInput, 10);
    if (isNaN(newGoal) || newGoal < 1000) {
      setGoalInput(dailyGoal.toString());
      return;
    }

    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO step_tracking_state (id, daily_goal) VALUES (1, ?)',
        [newGoal]
      );
      useStepStore.setState({ dailyGoal: newGoal });
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save step goal:', error);
    }
  }

  function handleCancelEdit() {
    setGoalInput(dailyGoal.toString());
    setIsEditing(false);
  }

  async function handleToggleTracking(enabled: boolean) {
    setTrackingEnabled(enabled);
    
    if (Platform.OS !== 'android' || !StepServiceModule) {
      console.warn('Step service not available on this platform');
      return;
    }

    try {
      if (enabled) {
        // Start the service
        await StepServiceModule.startService();
        useStepStore.getState().setStatus('tracking');
        console.log('✅ Step tracking started');
      } else {
        // Stop the service completely
        await StepServiceModule.stopService();
        useStepStore.getState().setStatus('unavailable');
        console.log('🛑 Step tracking stopped');
      }
    } catch (error) {
      console.error('Failed to toggle step tracking:', error);
      // Revert UI state on error
      setTrackingEnabled(!enabled);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Footprints size={20} color={COLORS.steps} />
        <Text style={styles.title}>Step Tracking</Text>
      </View>

      <Card style={styles.card}>
        {/* Daily Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Goal</Text>
          
          {isEditing ? (
            <View style={styles.editRow}>
              <TextInput
                value={goalInput}
                onChangeText={setGoalInput}
                keyboardType="number-pad"
                placeholder="e.g. 10000"
                style={styles.input}
                autoFocus
              />
              <View style={styles.editActions}>
                <Button
                  label="Save"
                  onPress={handleSaveGoal}
                  variant="primary"
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
              <Text style={styles.value}>{dailyGoal.toLocaleString()} steps</Text>
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Text style={styles.editButton}>Edit</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Tracking Toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Step Tracking</Text>
              <Text style={styles.description}>
                Count steps in background throughout the day
              </Text>
            </View>
            <Switch
              value={trackingEnabled}
              onValueChange={handleToggleTracking}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.steps }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>
      </Card>

      <Text style={styles.note}>
        Step tracking requires Activity Recognition permission and runs as a foreground service.
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
    color: COLORS.steps,
  },
  editRow: {
    gap: SPACING.md,
  },
  input: {
    flex: 1,
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
