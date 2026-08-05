import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import * as Notifications from 'expo-notifications';
import {
  AlertCircle,
  Trash2,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useUserStore } from '../../stores/userStore';
import { useCustomAlert } from '../../hooks/useCustomAlert';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { getTodayLocal } from '../../lib/dateUtils';
import {
  requestIgnoreBatteryOptimizations,
  openUsageAccessSettings,
  openAppSettings,
  isBatteryOptimizationIgnored,
} from '../../lib/permissions';
import { StepSettingsSection } from '../steps/StepSettingsSection';
import { SleepSettingsSection } from '../sleep/SleepSettingsSection';
import { WaterSettingsSection } from '../water/WaterSettingsSection';
import { CaloriesSettingsSection } from '../calories/CaloriesSettingsSection';
import { AbcSettingsSection } from '../abc/AbcSettingsSection';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import {
  hydrateStepStore,
  hydrateSleepStore,
  hydrateWaterStore,
  hydrateCaloriesStore,
  hydrateAbcStore,
} from '../../stores';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

export function SettingsScreen() {
  const db = useSQLiteContext();
  const { profile, setProfile } = useUserStore();
  const { showSuccess, showError, showConfirm } = useCustomAlert();
  const tabBarHeight = useBottomTabBarHeight();
  const isFocused = useIsFocused();
  
  // Loading state for smooth transitions
  const [isLoading, setIsLoading] = useState(true);

  // Simulate loading delay for smooth skeleton transition
  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 100); // Reduced from 120ms
      return () => clearTimeout(timer);
    }
  }, [isFocused]);

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: profile?.username || '',
    age: profile?.age?.toString() || '',
    height_cm: profile?.height_cm?.toString() || '',
    weight_kg: profile?.weight_kg?.toString() || '',
  });

  const handleUpdateProfile = useCallback(async () => {
    if (!profile) return;

    const age = parseInt(profileForm.age, 10);
    const height = parseFloat(profileForm.height_cm);
    const weight = parseFloat(profileForm.weight_kg);

    if (
      !profileForm.username.trim() ||
      isNaN(age) || age < 1 || age > 120 ||
      isNaN(height) || height < 100 || height > 250 ||
      isNaN(weight) || weight < 30 || weight > 300
    ) {
      showError('Invalid input', 'Please check all fields are valid.');
      return;
    }

    try {
      await db.runAsync(
        `UPDATE user_profile 
         SET username = ?, age = ?, height_cm = ?, weight_kg = ?, updated_at = ? 
         WHERE id = 1`,
        [profileForm.username.trim(), age, height, weight, new Date().toISOString()]
      );

      const updated = {
        ...profile,
        username: profileForm.username.trim(),
        age,
        height_cm: height,
        weight_kg: weight,
      };
      setProfile(updated);
      setEditingProfile(false);
      showSuccess('Success', 'Profile updated successfully.');
    } catch (error) {
      console.error('Failed to update profile:', error);
      showError('Error', 'Failed to save changes. Please try again.');
    }
  }, [profileForm, profile, db, setProfile, showError, showSuccess]);

  const resetProfileForm = useCallback(() => {
    setProfileForm({
      username: profile?.username || '',
      age: profile?.age?.toString() || '',
      height_cm: profile?.height_cm?.toString() || '',
      weight_kg: profile?.weight_kg?.toString() || '',
    });
    setEditingProfile(false);
  }, [profile]);

  if (!profile) {
    return (
      <ScreenWrapper padded={false}>
        <View style={styles.container}>
          <Text style={styles.title}>Settings</Text>
          <Text>Loading...</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded={false}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>
        
        {isLoading ? (
          <View style={styles.section}>
            <SkeletonCard lines={2} height={80} />
            <SkeletonCard lines={4} height={160} />
            <SkeletonCard lines={3} height={120} />
            <SkeletonCard lines={3} height={120} />
            <SkeletonCard lines={2} height={80} />
          </View>
        ) : (
          <>
            {/* Profile Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Profile</Text>
              </View>

          <Card style={styles.card}>
            {editingProfile ? (
              <>
                {/* Username */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <TextInput
                    value={profileForm.username}
                    onChangeText={(value) => setProfileForm(prev => ({ ...prev, username: value }))}
                    placeholder="Your name"
                    style={styles.input}
                  />
                </View>

                {/* Gender */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Gender</Text>
                  <View style={styles.genderOptions}>
                    {(['male', 'female', 'other'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.genderChip,
                          profile.gender === option && styles.genderChipActive
                        ]}
                        onPress={() => {
                          setProfile({ ...profile, gender: option });
                        }}
                      >
                        <Text style={[
                          styles.genderChipText,
                          profile.gender === option && styles.genderChipTextActive
                        ]}>
                          {option.charAt(0).toUpperCase() + option.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Age */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Age</Text>
                  <TextInput
                    value={profileForm.age}
                    onChangeText={(value) => setProfileForm(prev => ({ ...prev, age: value }))}
                    placeholder="25"
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>

                {/* Height */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Height (cm)</Text>
                  <TextInput
                    value={profileForm.height_cm}
                    onChangeText={(value) => setProfileForm(prev => ({ ...prev, height_cm: value }))}
                    placeholder="170"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                {/* Weight */}
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Weight (kg)</Text>
                  <TextInput
                    value={profileForm.weight_kg}
                    onChangeText={(value) => setProfileForm(prev => ({ ...prev, weight_kg: value }))}
                    placeholder="70"
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </View>

                {/* Action buttons */}
                <View style={styles.editActions}>
                  <Button
                    label="Save Changes"
                    onPress={handleUpdateProfile}
                    variant="primary"
                    accentColor={COLORS.steps}
                    size="sm"
                  />
                  <Button
                    label="Cancel"
                    onPress={resetProfileForm}
                    variant="ghost"
                    size="sm"
                  />
                </View>
              </>
            ) : (
              <>
                {/* Profile Summary */}
                <View style={styles.profileSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Username:</Text>
                    <Text style={styles.summaryValue}>{profile.username}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Gender:</Text>
                    <Text style={styles.summaryValue}>
                      {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Age:</Text>
                    <Text style={styles.summaryValue}>{profile.age} years</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Height:</Text>
                    <Text style={styles.summaryValue}>{profile.height_cm} cm</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Weight:</Text>
                    <Text style={styles.summaryValue}>{profile.weight_kg} kg</Text>
                  </View>
                </View>

                {/* Edit Button */}
                <TouchableOpacity
                  style={styles.editProfileButton}
                  onPress={() => setEditingProfile(true)}
                >
                  <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
              </>
            )}
          </Card>
        </View>
        
        {/* Settings Sections */}
        <PermissionsSection />
        <StepSettingsSection />
        <SleepSettingsSection />
        <WaterSettingsSection />
        <CaloriesSettingsSection />
        <AbcSettingsSection />

        {/* Data Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.dataSubtitle}>
              Clear historical data for each feature. Your current day data will be preserved.
            </Text>

            <View style={styles.dataList}>
              <DataClearButton
                db={db}
                label="Steps History"
                description="Clears all step records except today"
                color={COLORS.steps}
                onClear={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
                  await hydrateStepStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="Sleep History"
                description="Clears all sleep sessions except active"
                color={COLORS.sleep}
                onClear={async () => {
                  await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
                  await hydrateSleepStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="Water History"
                description="Clears all water logs except today"
                color={COLORS.water}
                onClear={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
                  await hydrateWaterStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="Calories History"
                description="Clears all workout logs except today"
                color={COLORS.calories}
                onClear={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
                  await hydrateCaloriesStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="ABC History"
                description="Clears all ABC logs except today"
                color={COLORS.abc}
                onClear={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);
                  await hydrateAbcStore(db);
                }}
              />
            </View>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => handleClearAllData()}
              >
                <Text style={styles.dangerBtnText}>Clear All Data</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
          </>
        )}
      </ScrollView>
    </ScreenWrapper>
  );

  async function handleClearAllData() {
    showConfirm(
      'Clear All Data',
      'This will delete ALL historical data across all features. This action cannot be undone. Are you sure?',
      async () => {
        try {
          const today = getTodayLocal();
          
          await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
          await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
          await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);

          await hydrateStepStore(db);
          await hydrateSleepStore(db);
          await hydrateWaterStore(db);
          await hydrateCaloriesStore(db);
          await hydrateAbcStore(db);

          showSuccess('Success', 'All historical data has been cleared.');
        } catch (error) {
          console.error('Failed to clear data:', error);
          showError('Error', 'Failed to clear data. Please try again.');
        }
      },
      'Clear All',
      true
    );
  }
}

interface DataClearButtonProps {
  db: any;
  label: string;
  description: string;
  color: string;
  onClear: () => Promise<void>;
}

function DataClearButton({ db, label, description, color, onClear }: DataClearButtonProps) {
  const [clearing, setClearing] = useState(false);
  const { showSuccess, showError, showConfirm } = useCustomAlert();

  async function handleClear() {
    showConfirm(
      `Clear ${label}`,
      `${description}. This cannot be undone. Continue?`,
      () => {
        // Show success immediately for instant feedback
        showSuccess('Success', `${label} cleared successfully.`);
        
        // Clear in background without blocking
        setClearing(true);
        onClear()
          .catch((error) => {
            console.error(`Failed to clear ${label}:`, error);
            showError('Error', `Failed to clear ${label}. Please try again.`);
          })
          .finally(() => {
            setClearing(false);
          });
      },
      'Clear',
      true
    );
  }

  return (
    <TouchableOpacity
      style={styles.dataClearItem}
      onPress={handleClear}
      disabled={clearing}
    >
      <View style={[styles.dataClearDot, { backgroundColor: color }]} />
      <View style={styles.dataClearInfo}>
        <Text style={styles.dataClearLabel}>{label}</Text>
        <Text style={styles.dataClearDesc}>{description}</Text>
      </View>
      <Trash2 size={16} color={COLORS.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  container: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.xxl,
  },
  title: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  section: {
    gap: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  card: {
    gap: SPACING.lg,
  },
  // Profile styles
  field: {
    gap: SPACING.xs,
  },
  fieldLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textSecondary,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  editBtn: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.steps,
  },
  input: {
    flex: 1,
  },
  genderOptions: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  genderChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    backgroundColor: COLORS.glass,
  },
  genderChipActive: {
    borderColor: COLORS.steps,
    backgroundColor: `${COLORS.steps}18`,
  },
  genderChipText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  genderChipTextActive: {
    color: COLORS.steps,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  profileSummary: {
    gap: SPACING.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textPrimary,
  },
  // Permissions styles
  permissionsSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  permissionsList: {
    gap: SPACING.md,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.glassHighlight,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  permissionInfo: {
    flex: 1,
    gap: 2,
  },
  permissionName: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  permissionDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  permissionStatus: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.success,
  },
  permissionAction: {
    fontSize: TYPOGRAPHY.size.xs,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.warning,
  },
  permissionsFooter: {
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
  },
  systemSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    alignSelf: 'flex-start',
  },
  systemSettingsText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.medium,
    color: COLORS.textSecondary,
  },
  // Error state
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xxl,
  },
  errorText: {
    fontSize: TYPOGRAPHY.size.md,
    color: COLORS.textSecondary,
    flex: 1,
  },
  // Data Management styles
  dataSubtitle: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  dataList: {
    gap: SPACING.sm,
  },
  dataClearItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: 'transparent', // Transparent background
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  dataClearDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dataClearInfo: {
    flex: 1,
    gap: 2,
  },
  dataClearLabel: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  dataClearDesc: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
  },
  dangerZone: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
    gap: SPACING.sm,
  },
  dangerTitle: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.error,
  },
  dangerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.error,
    backgroundColor: `${COLORS.error}10`,
    alignSelf: 'flex-start',
  },
  dangerBtnText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.error,
  },
  editProfileButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.steps,
    backgroundColor: `${COLORS.steps}10`,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  editProfileButtonText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.steps,
  },
});

// ── Permissions Section ───────────────────────────────────────────────────────

function PermissionsSection() {
  const [activityStatus, setActivityStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [notifStatus, setNotifStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const [batteryStatus, setBatteryStatus] = useState<'unknown' | 'granted' | 'denied'>('unknown');

  useEffect(() => {
    async function checkPermissions() {
      // Activity Recognition
      if (Platform.OS === 'android') {
        try {
          const result = await PermissionsAndroid.check(
            PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION
          );
          setActivityStatus(result ? 'granted' : 'denied');
        } catch {
          setActivityStatus('denied');
        }
      }

      // Notifications
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setNotifStatus(status === 'granted' ? 'granted' : 'denied');
      } catch {
        setNotifStatus('denied');
      }

      // Battery optimization
      try {
        const ignored = await isBatteryOptimizationIgnored();
        setBatteryStatus(ignored ? 'granted' : 'denied');
      } catch {
        setBatteryStatus('denied');
      }
    }
    checkPermissions();
  }, []);

  async function handleRequestActivity() {
    if (Platform.OS !== 'android') return;
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
        {
          title: 'Physical Activity Permission',
          message: 'Tracker needs access to count your steps.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        }
      );
      setActivityStatus(result === PermissionsAndroid.RESULTS.GRANTED ? 'granted' : 'denied');
    } catch {
      setActivityStatus('denied');
    }
  }

  async function handleRequestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    setNotifStatus(status === 'granted' ? 'granted' : 'denied');
  }

  function handleRequestBattery() {
    requestIgnoreBatteryOptimizations();
    setBatteryStatus('granted');
  }

  return (
    <View style={permStyles.container}>
      <View style={permStyles.header}>
        <Text style={permStyles.title}>Permissions</Text>
      </View>
      <Card style={permStyles.card}>
        <PermRow
          label="Physical Activity"
          description="Required for step counting"
          status={activityStatus}
          onPress={handleRequestActivity}
        />
        <PermRow
          label="Notifications"
          description="For step tracking and reminders"
          status={notifStatus}
          onPress={handleRequestNotifications}
        />
        <PermRow
          label="Battery Optimization"
          description="Keeps step tracking running in background"
          status={batteryStatus}
          onPress={handleRequestBattery}
          actionLabel="Open Settings"
        />
      </Card>
    </View>
  );
}

function PermRow({
  label,
  description,
  status,
  onPress,
  actionLabel = 'Allow',
}: {
  label: string;
  description: string;
  status: 'unknown' | 'granted' | 'denied';
  onPress: () => void;
  actionLabel?: string;
}) {
  return (
    <View style={permStyles.row}>
      <View style={permStyles.info}>
        <Text style={permStyles.label}>{label}</Text>
        <Text style={permStyles.desc}>{description}</Text>
      </View>
      {status === 'granted' ? (
        <Text style={permStyles.granted}>Granted</Text>
      ) : (
        <TouchableOpacity
          style={permStyles.allowBtn}
          onPress={onPress}
          activeOpacity={0.8}
        >
          <Text style={permStyles.allowText}>
            {status === 'denied' ? 'Retry' : actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const permStyles = StyleSheet.create({
  container: { gap: SPACING.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  title: {
    fontSize: TYPOGRAPHY.size.lg,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  card: { gap: SPACING.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  info: { flex: 1, gap: 2 },
  label: {
    fontSize: TYPOGRAPHY.size.md,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.textPrimary,
  },
  desc: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  granted: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.success,
  },
  allowBtn: {
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.steps,
  },
  allowText: {
    fontSize: TYPOGRAPHY.size.sm,
    fontWeight: TYPOGRAPHY.weight.semibold,
    color: COLORS.steps,
  },
});
