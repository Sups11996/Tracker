import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Switch, TextInput } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useIsFocused } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';
import { Circle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useUserStore } from '../../stores/userStore';
import { useAbcStore, hydrateAbcStore } from '../../stores/abcStore';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

const ABC_SUMMARY_NOTIFICATION_ID = 'abc_daily_summary';
const SUMMARY_HOUR = 22;   // 10 PM
const SUMMARY_MINUTE = 0;

async function scheduleAbcSummary() {
  await Notifications.cancelScheduledNotificationAsync(ABC_SUMMARY_NOTIFICATION_ID);
  await Notifications.scheduleNotificationAsync({
    identifier: ABC_SUMMARY_NOTIFICATION_ID,
    content: {
      title: '📊 ABC Daily Summary',
      body: "Check today's ABC progress before the day ends.",
      sound: true,
      android: { channelId: 'default', smallIcon: 'ic_notification' },
    },
    trigger: {
      type: 'daily',
      hour: SUMMARY_HOUR,
      minute: SUMMARY_MINUTE,
      repeats: true,
    },
  });
}

async function cancelAbcSummary() {
  await Notifications.cancelScheduledNotificationAsync(ABC_SUMMARY_NOTIFICATION_ID);
}

export function AbcSettingsSection() {
  const db = useSQLiteContext();
  const isFocused = useIsFocused();
  const { profile } = useUserStore();
  const { dailyGoal } = useAbcStore();

  const [abcEnabled, setAbcEnabled] = useState(!!(profile?.uses_abc));
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [goalInput, setGoalInput] = useState(dailyGoal.toString());

  // Load saved notification setting from DB
  useEffect(() => {
    if (!isFocused) return;
    async function load() {
      try {
        const row = await db.getFirstAsync<{ value: string }>(
          `SELECT value FROM kv_store WHERE key = 'abc_summary_enabled'`
        );
        setNotificationsEnabled(row?.value === '1');
        setIsInitialized(true);
      } catch {
        setIsInitialized(true);
      }
    }
    load();
  }, [isFocused, db]);

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
    if (!enabled) {
      setNotificationsEnabled(false);
      await cancelAbcSummary();
      await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['abc_summary_enabled', '0']
      );
    }

    try {
      await db.runAsync(
        'UPDATE user_profile SET uses_abc = ?, updated_at = ? WHERE id = 1',
        [enabled ? 1 : 0, new Date().toISOString()]
      );
      if (profile) {
        useUserStore.getState().setProfile({ ...profile, uses_abc: enabled });
      }
    } catch (e) {
      setAbcEnabled(!enabled);
    }
  }

  async function handleNotificationsToggle(enabled: boolean) {
    setNotificationsEnabled(enabled);
    try {
      await db.runAsync(
        'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
        ['abc_summary_enabled', enabled ? '1' : '0']
      );
      if (enabled) {
        await scheduleAbcSummary();
      } else {
        await cancelAbcSummary();
      }
    } catch (e) {
      setNotificationsEnabled(!enabled);
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

        {/* Daily goal */}
        {abcEnabled && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Daily Goal</Text>
            <Text style={styles.description}>Target count per day</Text>
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
              <Text style={styles.goalUnit}>times / day</Text>
            </View>
          </View>
        )}

        {/* Daily Summary Notification */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Daily Summary</Text>
              <Text style={styles.description}>Get a daily summary at 10:00 PM</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationsToggle}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.abc }}
              thumbColor={COLORS.textPrimary}
              disabled={!abcEnabled || !isInitialized}
            />
          </View>
        </View>
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
