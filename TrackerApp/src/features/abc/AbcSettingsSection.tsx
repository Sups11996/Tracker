import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, TextInput } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Circle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useUserStore } from '../../stores/userStore';
import { useAbcStore } from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function AbcSettingsSection() {
  const db = useSQLiteContext();
  const { profile } = useUserStore();
  const { dailyGoal } = useAbcStore();

  const [abcEnabled, setAbcEnabled] = useState(!!(profile?.uses_abc));
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());

  useEffect(() => {
    setGoalInput(dailyGoal.toString());
  }, [dailyGoal]);

  async function handleGoalSave() {
    const parsed = parseInt(goalInput, 10);
    if (isNaN(parsed) || parsed < 1) {
      setGoalInput(dailyGoal.toString());
      return;
    }
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO kv_store (key, value) VALUES ('abc_daily_goal', ?)`,
        [parsed.toString()]
      );
      useAbcStore.getState().setDailyGoal(parsed);
    } catch (e) {
      setGoalInput(dailyGoal.toString());
    }
  }

  async function handleAbcToggle(enabled: boolean) {
    setAbcEnabled(enabled);
    try {
      await db.runAsync(
        'UPDATE user_profile SET uses_abc = ?, updated_at = ? WHERE id = 1',
        [enabled ? 1 : 0, Date.now()]
      );
      if (profile) {
        useUserStore.getState().setProfile({ ...profile, uses_abc: enabled });
      }
    } catch (e) {
      setAbcEnabled(!enabled);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Circle size={20} color={COLORS.abc} fill={COLORS.abc} />
        <Text style={styles.title}>ABC</Text>
      </View>

      <Card style={styles.card}>
        {/* ABC tracking toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>ABC Tracking</Text>
              <Text style={styles.description}>Enable ABC counter feature</Text>
            </View>
            <Switch
              value={abcEnabled}
              onValueChange={handleAbcToggle}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.abc }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>

        {/* Daily limit */}
        {abcEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Limit</Text>
            <Text style={styles.description}>Track a habit you want to limit (e.g., reduce unwanted behaviors)</Text>
            <View style={styles.goalRow}>
              <TextInput
                style={styles.goalInput}
                value={goalInput}
                onChangeText={setGoalInput}
                onBlur={handleGoalSave}
                onSubmitEditing={handleGoalSave}
                keyboardType="number-pad"
                maxLength={4}
                returnKeyType="done"
                placeholderTextColor={COLORS.textMuted}
              />
              <Text style={styles.goalUnit}>/ day</Text>
            </View>
          </View>
        )}
      </Card>

      <Text style={styles.note}>
        Disabling ABC will hide it from your home screen. Historical data is preserved.
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
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  goalInput: {
    width: 80,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glassHighlight,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    textAlign: 'center',
  },
  goalUnit: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
});
