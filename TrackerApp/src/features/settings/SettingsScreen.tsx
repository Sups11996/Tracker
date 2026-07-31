import React, { useState, useCallback } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import {
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  Settings,
  Trash2,
  Database,
} from 'lucide-react-native';
import { ScreenWrapper } from '../../components/ui/ScreenWrapper';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { TextInput } from '../../components/ui/TextInput';
import { useUserStore } from '../../stores/userStore';
import { getTodayLocal } from '../../lib/dateUtils';
import {
  requestIgnoreBatteryOptimizations,
  openUsageAccessSettings,
  openAppSettings,
} from '../../lib/permissions';
import { StepSettingsSection } from '../steps/StepSettingsSection';
import { SleepSettingsSection } from '../sleep/SleepSettingsSection';
import { WaterSettingsSection } from '../water/WaterSettingsSection';
import { CaloriesSettingsSection } from '../calories/CaloriesSettingsSection';
import { ScreenTimeSettingsSection } from '../screentime/ScreenTimeSettingsSection';
import { AbcSettingsSection } from '../abc/AbcSettingsSection';
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

  // Profile editing state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    username: profile?.username || '',
    age: profile?.age?.toString() || '',
    height_cm: profile?.height_cm?.toString() || '',
    weight_kg: profile?.weight_kg?.toString() || '',
  });

  // Gender selector state
  const [editingGender, setEditingGender] = useState(false);

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
      Alert.alert('Invalid input', 'Please check all fields are valid.');
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
    } catch (error) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  }, [profileForm, profile, db, setProfile]);

  const handleUpdateGender = useCallback(async (gender: 'male' | 'female' | 'other') => {
    if (!profile) return;

    try {
      await db.runAsync(
        'UPDATE user_profile SET gender = ?, updated_at = ? WHERE id = 1',
        [gender, new Date().toISOString()]
      );

      setProfile({ ...profile, gender });
      setEditingGender(false);
    } catch (error) {
      console.error('Failed to update gender:', error);
      Alert.alert('Error', 'Failed to save changes. Please try again.');
    }
  }, [profile, db, setProfile]);

  const resetProfileForm = useCallback(() => {
    setProfileForm({
      username: profile?.username || '',
      age: profile?.age?.toString() || '',
      height_cm: profile?.height_cm?.toString() || '',
      weight_kg: profile?.weight_kg?.toString() || '',
    });
    setEditingProfile(false);
    setEditingGender(false);
  }, [profile]);

  const openSystemSettings = useCallback(() => {
    openAppSettings();
  }, []);

  if (!profile) {
    return (
      <ScreenWrapper>
        <View style={styles.container}>
          <Text style={styles.title}>Settings</Text>
          <Card style={styles.errorCard}>
            <AlertCircle size={24} color={COLORS.error} />
            <Text style={styles.errorText}>No profile found. Please complete onboarding first.</Text>
          </Card>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Settings</Text>

        {/* Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={20} color={COLORS.steps} />
            <Text style={styles.sectionTitle}>Profile</Text>
          </View>

          <Card style={styles.card}>
            {/* Username */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Username</Text>
              {editingProfile ? (
                <TextInput
                  value={profileForm.username}
                  onChangeText={(value) => setProfileForm(prev => ({ ...prev, username: value }))}
                  placeholder="Your name"
                  style={styles.input}
                />
              ) : (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldValue}>{profile.username}</Text>
                  <TouchableOpacity onPress={() => setEditingProfile(true)}>
                    <Text style={styles.editBtn}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Gender */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Gender</Text>
              {editingGender ? (
                <View style={styles.genderOptions}>
                  {(['male', 'female', 'other'] as const).map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={[
                        styles.genderChip,
                        profile.gender === option && styles.genderChipActive
                      ]}
                      onPress={() => handleUpdateGender(option)}
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
              ) : (
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldValue}>
                    {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)}
                  </Text>
                  <TouchableOpacity onPress={() => setEditingGender(true)}>
                    <Text style={styles.editBtn}>Edit</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {editingProfile && (
              <>
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
            )}

            {!editingProfile && !editingGender && (
              <View style={styles.profileSummary}>
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
            )}
          </Card>
        </View>

        {/* Permissions Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={20} color={COLORS.screenTime} />
            <Text style={styles.sectionTitle}>Permissions</Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.permissionsSubtitle}>
              TrackerApp needs these permissions for full functionality
            </Text>

            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <View style={styles.permissionIcon}>
                  <CheckCircle2 size={16} color={COLORS.success} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Activity Recognition</Text>
                  <Text style={styles.permissionDesc}>Count steps automatically</Text>
                </View>
                <Text style={styles.permissionStatus}>Granted</Text>
              </View>

              <View style={styles.permissionItem}>
                <View style={styles.permissionIcon}>
                  <CheckCircle2 size={16} color={COLORS.success} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Notifications</Text>
                  <Text style={styles.permissionDesc}>Show tracking status</Text>
                </View>
                <Text style={styles.permissionStatus}>Granted</Text>
              </View>

              <View style={styles.permissionItem}>
                <View style={styles.permissionIcon}>
                  <AlertCircle size={16} color={COLORS.warning} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Battery Optimization</Text>
                  <Text style={styles.permissionDesc}>Keep services running</Text>
                </View>
                <TouchableOpacity onPress={() => requestIgnoreBatteryOptimizations()}>
                  <Text style={styles.permissionAction}>Fix</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.permissionItem}>
                <View style={styles.permissionIcon}>
                  <AlertCircle size={16} color={COLORS.warning} />
                </View>
                <View style={styles.permissionInfo}>
                  <Text style={styles.permissionName}>Usage Stats</Text>
                  <Text style={styles.permissionDesc}>Track screen time</Text>
                </View>
                <TouchableOpacity onPress={() => openUsageAccessSettings()}>
                  <Text style={styles.permissionAction}>Enable</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.permissionsFooter}>
              <TouchableOpacity style={styles.systemSettingsBtn} onPress={openSystemSettings}>
                <Settings size={16} color={COLORS.textSecondary} />
                <Text style={styles.systemSettingsText}>Open System Settings</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>

        {/* Feature Settings Sections */}
        <StepSettingsSection />
        <SleepSettingsSection />
        <WaterSettingsSection />
        <CaloriesSettingsSection />
        <ScreenTimeSettingsSection />
        {profile.uses_abc && <AbcSettingsSection />}

        {/* Data Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Database size={20} color={COLORS.error} />
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
                label="Screen Time History"
                description="Clears all screen time data except today"
                color={COLORS.screenTime}
                onClear={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM app_usage_sessions WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM screen_time_daily_summary WHERE date < ?', [today]);
                }}
              />

              {profile.uses_abc && (
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
              )}
            </View>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <TouchableOpacity
                style={styles.dangerBtn}
                onPress={() => handleClearAllData()}
              >
                <Trash2 size={16} color={COLORS.error} />
                <Text style={styles.dangerBtnText}>Clear All Data</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );

  async function handleClearAllData() {
    Alert.alert(
      'Clear All Data',
      'This will delete ALL historical data across all features. This action cannot be undone. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              const today = getTodayLocal();
              
              await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
              await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM app_usage_sessions WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM screen_time_daily_summary WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
              await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);

              await hydrateStepStore(db);
              await hydrateSleepStore(db);
              await hydrateWaterStore(db);
              await hydrateCaloriesStore(db);
              await hydrateAbcStore(db);

              Alert.alert('Success', 'All historical data has been cleared.');
            } catch (error) {
              console.error('Failed to clear data:', error);
              Alert.alert('Error', 'Failed to clear data. Please try again.');
            }
          },
        },
      ]
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

  async function handleClear() {
    Alert.alert(
      `Clear ${label}`,
      `${description}. This cannot be undone. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setClearing(true);
            try {
              await onClear();
              Alert.alert('Success', `${label} cleared successfully.`);
            } catch (error) {
              console.error(`Failed to clear ${label}:`, error);
              Alert.alert('Error', `Failed to clear ${label}. Please try again.`);
            } finally {
              setClearing(false);
            }
          },
        },
      ]
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
      <Trash2 size={16} color={clearing ? COLORS.textMuted : COLORS.error} />
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
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.glassBorder,
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
  permissionIcon: {
    width: 24,
    alignItems: 'center',
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
    backgroundColor: COLORS.glassHighlight,
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
});
