import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Circle } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { useUserStore } from '../../stores/userStore';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function AbcSettingsSection() {
  const db = useSQLiteContext();
  const { profile } = useUserStore();
  
  const [abcEnabled, setAbcEnabled] = useState(profile?.uses_abc ?? false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  async function handleAbcToggle(enabled: boolean) {
    try {
      await db.runAsync(
        'UPDATE user_profile SET uses_abc = ?, updated_at = ? WHERE id = 1',
        [enabled ? 1 : 0, new Date().toISOString()]
      );
      setAbcEnabled(enabled);
      if (profile) {
        useUserStore.getState().setProfile({ ...profile, uses_abc: enabled });
      }
    } catch (e) {
      console.error('Failed to update ABC setting:', e);
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
              <Text style={styles.description}>
                Enable ABC counter feature
              </Text>
            </View>
            <Switch
              value={abcEnabled}
              onValueChange={handleAbcToggle}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.abc }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Daily Summary</Text>
              <Text style={styles.description}>
                Get a daily summary notification
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.abc }}
              thumbColor={COLORS.textPrimary}
              disabled={!abcEnabled}
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
});
