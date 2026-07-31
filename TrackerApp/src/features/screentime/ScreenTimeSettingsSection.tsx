import React, { useState } from 'react';
import { StyleSheet, Text, View, Switch } from 'react-native';
import { Smartphone } from 'lucide-react-native';
import { Card } from '../../components/ui/Card';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';

export function ScreenTimeSettingsSection() {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Smartphone size={20} color={COLORS.screenTime} />
        <Text style={styles.title}>Screen Time</Text>
      </View>

      <Card style={styles.card}>
        {/* Tracking toggle */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Screen Time Tracking</Text>
              <Text style={styles.description}>
                Monitor your daily screen time and app usage
              </Text>
            </View>
            <Switch
              value={trackingEnabled}
              onValueChange={setTrackingEnabled}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.screenTime }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <View style={styles.row}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Usage Notifications</Text>
              <Text style={styles.description}>
                Get awareness alerts about your screen time
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.glassHighlight, true: COLORS.screenTime }}
              thumbColor={COLORS.textPrimary}
              disabled={!trackingEnabled}
            />
          </View>
        </View>
      </Card>

      <Text style={styles.note}>
        Screen time data is fetched from Android's Usage Access service. Permission required.
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
