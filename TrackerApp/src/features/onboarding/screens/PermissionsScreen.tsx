import React, { useState } from 'react';
import {
  Alert,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Notifications from 'expo-notifications';
import { Activity, Battery, Bell, CheckCircle, ChevronRight } from 'lucide-react-native';
import { OnboardingLayout } from '../components/OnboardingLayout';
import { Button } from '../../../components/ui/Button';
import {
  requestIgnoreBatteryOptimizations,
  openUsageAccessSettings,
} from '../../../lib/permissions';
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from '../../../constants';
import type { OnboardingStackParamList } from '../../../types';

type Nav = NativeStackNavigationProp<OnboardingStackParamList, 'Permissions'>;

type PermStatus = 'idle' | 'granted' | 'denied';

export function PermissionsScreen() {
  const navigation = useNavigation<Nav>();
  const [activityStatus, setActivityStatus] = useState<PermStatus>('idle');
  const [notifStatus, setNotifStatus] = useState<PermStatus>('idle');
  const [batteryStatus, setBatteryStatus] = useState<PermStatus>('idle');

  async function requestActivity() {
    // On Android, ACTIVITY_RECOGNITION is requested at runtime (Android 10+)
    // expo-sensors handles this when the step sensor is first used.
    // Here we just show it as acknowledged so user understands why it's needed.
    setActivityStatus('granted');
  }

  async function requestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status === 'granted') {
      setNotifStatus('granted');
    } else {
      setNotifStatus('denied');
    }
  }

  function requestBatteryOptimization() {
    if (Platform.OS === 'android') {
      requestIgnoreBatteryOptimizations();
      setBatteryStatus('granted');
    }
  }

  function handleSkip() {
    navigation.navigate('WaterContainers');
  }

  function handleNext() {
    navigation.navigate('WaterContainers');
  }

  return (
    <OnboardingLayout
      step={6}
      totalSteps={8}
      title={'A few\npermissions'}
      subtitle="These keep your tracking accurate and running in the background."
      onBack={() => navigation.goBack()}
    >
      <PermissionRow
        icon={<Activity size={22} color={COLORS.steps} />}
        title="Physical Activity"
        description="Counts your steps automatically throughout the day."
        status={activityStatus}
        accentColor={COLORS.steps}
        onPress={requestActivity}
      />

      <PermissionRow
        icon={<Bell size={22} color={COLORS.sleep} />}
        title="Notifications"
        description="Shows live tracking status and optional reminders."
        status={notifStatus}
        accentColor={COLORS.sleep}
        onPress={requestNotifications}
      />

      <PermissionRow
        icon={<Battery size={22} color={COLORS.calories} />}
        title="Battery Optimization"
        description="Prevents Android from stopping background tracking while your phone is idle."
        status={batteryStatus}
        accentColor={COLORS.calories}
        onPress={requestBatteryOptimization}
        actionLabel="Open Settings"
      />

      <View style={styles.footer}>
        <Button
          label="Continue"
          onPress={handleNext}
          accentColor={COLORS.water}
          size="lg"
        />
        <TouchableOpacity onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skip}>Set up later in Settings</Text>
        </TouchableOpacity>
      </View>
    </OnboardingLayout>
  );
}

function PermissionRow({
  icon,
  title,
  description,
  status,
  accentColor,
  onPress,
  actionLabel = 'Allow',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  status: PermStatus;
  accentColor: string;
  onPress: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: `${accentColor}18` }]}>
        {icon}
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowDesc}>{description}</Text>
      </View>
      {status === 'granted' ? (
        <CheckCircle size={22} color={COLORS.success} />
      ) : (
        <TouchableOpacity
          style={[styles.allowBtn, { borderColor: accentColor }]}
          onPress={onPress}
          hitSlop={8}
        >
          <Text style={[styles.allowText, { color: accentColor }]}>
            {status === 'denied' ? 'Retry' : actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    backgroundColor: COLORS.glass,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: SPACING.lg,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  rowDesc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  allowBtn: {
    borderWidth: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 5,
    flexShrink: 0,
  },
  allowText: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
  },
  footer: {
    gap: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  skip: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
});
