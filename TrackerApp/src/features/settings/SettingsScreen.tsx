import React, { useState, useCallback, useEffect } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  PermissionsAndroid,
  NativeModules,
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
import { useStepStore } from '../../stores/stepStore';
import { useWaterStore } from '../../stores/waterStore';
import { useSleepStore } from '../../stores/sleepStore';
import { useCaloriesStore } from '../../stores/caloriesStore';
import { useAbcStore } from '../../stores/abcStore';
import { seedDatabase, clearAllData } from '../../lib/seedData';
import { COLORS, SPACING, TYPOGRAPHY, RADIUS } from '../../constants';

// Convert cm to ft.in display string (e.g. 175 → "5.9")
function cmToFtIn(cm: number): string {
  if (!cm) return '';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}.${inches}`;
}

// Display cm as 5'9" format
function cmToFtInDisplay(cm: number): string {
  if (!cm) return '';
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return `${feet}'${inches}"`;
}

// Convert ft.in string (e.g. "5.9") to cm
function ftInToCm(ftIn: string): number {
  const parsed = parseFloat(ftIn);
  if (isNaN(parsed)) return NaN;
  const feet = Math.floor(parsed);
  const inches = Math.round((parsed - feet) * 10);
  if (inches > 11) return NaN;
  return Math.round(feet * 30.48 + inches * 2.54);
}

export function SettingsScreen() {
  const db = useSQLiteContext();
  const { profile, setProfile } = useUserStore();
  const { showSuccess, showError, showConfirm, showAlert } = useCustomAlert();
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
    height_ft_in: cmToFtIn(profile?.height_cm || 0),
    weight_kg: profile?.weight_kg?.toString() || '',
  });

  const handleUpdateProfile = useCallback(async () => {
    if (!profile) return;

    const age = parseInt(profileForm.age, 10);
    const height = ftInToCm(profileForm.height_ft_in);
    const weight = parseFloat(profileForm.weight_kg);

    if (
      !profileForm.username.trim() ||
      isNaN(age) || age < 1 || age > 120 ||
      isNaN(height) || height < 100 || height > 250 ||
      isNaN(weight) || weight < 30 || weight > 300
    ) {
      showError('Invalid input', 'Enter height as ft.in (e.g. 5.9 for 5\'9\")');
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
      showError('Error', 'Failed to save changes. Please try again.');
    }
  }, [profileForm, profile, db, setProfile, showError, showSuccess]);

  const resetProfileForm = useCallback(() => {
    setProfileForm({
      username: profile?.username || '',
      age: profile?.age?.toString() || '',
      height_ft_in: cmToFtIn(profile?.height_cm || 0),
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
        keyboardShouldPersistTaps="handled"
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
                  <Text style={styles.fieldLabel}>Height (ft.in)</Text>
                  <TextInput
                    value={profileForm.height_ft_in}
                    onChangeText={(value) => setProfileForm(prev => ({ ...prev, height_ft_in: value }))}
                    placeholder="e.g. 5.9"
                    keyboardType="decimal-pad"
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
                    <Text style={styles.summaryValue}>{cmToFtInDisplay(profile.height_cm)}</Text>
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
        <StepSettingsSection />
        <SleepSettingsSection />
        <WaterSettingsSection />
        <CaloriesSettingsSection />
        <AbcSettingsSection />
        <PermissionsSection />
        
        {/* Data Management Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Data Management</Text>
          </View>

          <Card style={styles.card}>
            <Text style={styles.dataSubtitle}>
              Clear historical data for each feature. Tap an item to choose what to delete.
            </Text>

            <View style={styles.dataList}>
              <DataClearButton
                db={db}
                label="Steps History"
                description="Step records"
                color={COLORS.steps}
                onClearToday={async () => {
                  const today = getTodayLocal();
                  
                  // Check rows before
                  const before = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM daily_steps WHERE date = ?', [today]);
                  
                  await db.runAsync('DELETE FROM daily_steps WHERE date = ?', [today]);
                  
                  // Check rows after
                  const after = await db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM daily_steps WHERE date = ?', [today]);
                  
                  // Reset native service counter
                  if (Platform.OS === 'android' && NativeModules.StepServiceModule) {
                    try {
                      await NativeModules.StepServiceModule.sendAction('reset');
                    } catch (error) {
                    }
                  }
                  
                  // Reset in-memory store
                  useStepStore.setState({ 
                    todaySteps: 0, 
                    todayDistance: 0, 
                    todayCalories: 0,
                    // Don't clear weekly/monthly - those are historical data
                  });
                  
                  await hydrateStepStore(db);
                }}
                onClearExceptToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
                  await hydrateStepStore(db);
                }}
                onClearAll={async () => {
                  await db.runAsync('DELETE FROM daily_steps');
                  
                  // Reset native service counter
                  if (Platform.OS === 'android' && NativeModules.StepServiceModule) {
                    try {
                      await NativeModules.StepServiceModule.sendAction('reset');
                    } catch (error) {
                    }
                  }
                  
                  await hydrateStepStore(db);
                  useStepStore.setState({ 
                    todaySteps: 0, 
                    todayDistance: 0, 
                    todayCalories: 0,
                    // Don't clear weekly/monthly - those are historical data
                  });
                }}
              />

              <DataClearButton
                db={db}
                label="Sleep History"
                description="Sleep sessions"
                color={COLORS.sleep}
                onClearToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0 AND date = ?', [today]);
                  
                  // Reset store state
                  useSleepStore.setState({ 
                    lastNightDuration: null,
                    lastNightQuality: null,
                    recentSessions: [] 
                  });
                  
                  await hydrateSleepStore(db);
                }}
                onClearExceptToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0 AND date < ?', [today]);
                  await hydrateSleepStore(db);
                }}
                onClearAll={async () => {
                  await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
                  
                  // Reset store state
                  useSleepStore.setState({ 
                    lastNightDuration: null,
                    lastNightQuality: null,
                    recentSessions: [] 
                  });
                  
                  await hydrateSleepStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="Water History"
                description="Water logs"
                color={COLORS.water}
                onClearToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM water_logs WHERE date = ?', [today]);
                  await db.runAsync('DELETE FROM water_daily_summary WHERE date = ?', [today]);
                  
                  // Reset store state
                  useWaterStore.setState({ 
                    todayTotal: 0,
                    logs: [],
                    undoStack: [],
                  });
                  
                  await hydrateWaterStore(db);
                }}
                onClearExceptToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
                  await hydrateWaterStore(db);
                }}
                onClearAll={async () => {
                  await db.runAsync('DELETE FROM water_logs');
                  await db.runAsync('DELETE FROM water_daily_summary');
                  
                  // Reset store state
                  useWaterStore.setState({ 
                    todayTotal: 0,
                    logs: [],
                    undoStack: [],
                  });
                  
                  await hydrateWaterStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="Calories History"
                description="Workout logs"
                color={COLORS.calories}
                onClearToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM workout_logs WHERE date = ?', [today]);
                  await db.runAsync('DELETE FROM calories_daily_summary WHERE date = ?', [today]);
                  
                  // Reset store state
                  useCaloriesStore.setState({ 
                    workoutCalories: 0,
                    workoutLogs: [],
                    totalCalories: useCaloriesStore.getState().walkingCalories, // Keep walking calories
                  });
                  
                  await hydrateCaloriesStore(db);
                }}
                onClearExceptToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
                  await hydrateCaloriesStore(db);
                }}
                onClearAll={async () => {
                  await db.runAsync('DELETE FROM workout_logs');
                  await db.runAsync('DELETE FROM calories_daily_summary');
                  
                  // Reset store state
                  useCaloriesStore.setState({ 
                    workoutCalories: 0,
                    workoutLogs: [],
                    totalCalories: useCaloriesStore.getState().walkingCalories, // Keep walking calories
                  });
                  
                  await hydrateCaloriesStore(db);
                }}
              />

              <DataClearButton
                db={db}
                label="ABC History"
                description="ABC logs"
                color={COLORS.abc}
                onClearToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM abc_logs WHERE date = ?', [today]);
                  await db.runAsync('DELETE FROM abc_daily_summary WHERE date = ?', [today]);
                  await hydrateAbcStore(db);
                  useAbcStore.getState().setTodayCount(0);
                }}
                onClearExceptToday={async () => {
                  const today = getTodayLocal();
                  await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
                  await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);
                  await hydrateAbcStore(db);
                }}
                onClearAll={async () => {
                  await db.runAsync('DELETE FROM abc_logs');
                  await db.runAsync('DELETE FROM abc_daily_summary');
                  await hydrateAbcStore(db);
                  useAbcStore.getState().setTodayCount(0);
                }}
              />
            </View>

            <View style={styles.dangerZone}>
              <Text style={styles.dangerTitle}>Testing / Demo Data</Text>
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: COLORS.steps, backgroundColor: `${COLORS.steps}10` }]}
                onPress={async () => {
                  try {
                    await seedDatabase(db);
                    await hydrateStepStore(db);
                    await hydrateSleepStore(db);
                    await hydrateWaterStore(db);
                    await hydrateCaloriesStore(db);
                    await hydrateAbcStore(db);
                    showSuccess('Success', 'Loaded 90 days of demo data for screenshots!');
                  } catch (e) {
                    showError('Error', 'Failed to load seed data');
                  }
                }}
              >
                <Text style={[styles.dangerBtnText, { color: COLORS.steps }]}>Load 3 Months Seed Data</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dangerBtn, { borderColor: COLORS.error, backgroundColor: `${COLORS.error}10`, marginTop: SPACING.sm }]}
                onPress={async () => {
                  showConfirm(
                    'Clear Seed Data',
                    'This will clear ALL data. Are you sure?',
                    async () => {
                      try {
                        await clearAllData(db);
                        await hydrateStepStore(db);
                        await hydrateSleepStore(db);
                        await hydrateWaterStore(db);
                        await hydrateCaloriesStore(db);
                        await hydrateAbcStore(db);
                        showSuccess('Success', 'All data cleared');
                      } catch (e) {
                        showError('Error', 'Failed to clear data');
                      }
                    },
                    'Clear All',
                    true
                  );
                }}
              >
                <Text style={[styles.dangerBtnText, { color: COLORS.error }]}>Clear All Seed Data</Text>
              </TouchableOpacity>
              <Text style={styles.dangerSubtext}>Load realistic data for screenshots and demos</Text>
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
      'This will delete ALL historical data across all features. This cannot be undone.',
      () => {
        // Ask about today's data
        setTimeout(() => {
          showAlert({
            title: 'Include Today?',
            message: "Do you also want to delete today's data?",
            type: 'warning',
            actions: [
              {
                text: 'Keep Today',
                style: 'default',
                onPress: () => clearAllData(false),
              },
              {
                text: 'Delete Everything',
                style: 'destructive',
                onPress: () => clearAllData(true),
              },
            ],
          });
        }, 100);
      },
      'Continue',
      true
    );
  }

  async function clearAllData(includeToday: boolean) {
    try {
      const today = getTodayLocal();

      if (includeToday) {
        await db.runAsync('DELETE FROM daily_steps');
        await db.runAsync('DELETE FROM sleep_sessions');
        await db.runAsync('DELETE FROM water_logs');
        await db.runAsync('DELETE FROM water_daily_summary');
        await db.runAsync('DELETE FROM workout_logs');
        await db.runAsync('DELETE FROM calories_daily_summary');
        await db.runAsync('DELETE FROM abc_logs');
        await db.runAsync('DELETE FROM abc_daily_summary');

        // Reset native step service
        if (Platform.OS === 'android' && NativeModules.StepServiceModule) {
          try { await NativeModules.StepServiceModule.sendAction('reset'); } catch (_) {}
        }

        // Reset all in-memory stores
        useStepStore.setState({ todaySteps: 0, todayDistance: 0, todayCalories: 0, weeklyData: [], monthlyData: [] });
        useWaterStore.setState({ todayTotal: 0, logs: [], undoStack: [] });
        useCaloriesStore.setState({ walkingCalories: 0, workoutCalories: 0, totalCalories: 0, workoutLogs: [] });
        useSleepStore.setState({ lastNightDuration: null, lastNightQuality: null, recentSessions: [], isActive: false, sessionStartTime: null, elapsedMinutes: 0 });
        useAbcStore.getState().setTodayCount(0);

      } else {
        await db.runAsync('DELETE FROM daily_steps WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM sleep_sessions WHERE is_active = 0');
        await db.runAsync('DELETE FROM water_logs WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM water_daily_summary WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM workout_logs WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM calories_daily_summary WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM abc_logs WHERE date < ?', [today]);
        await db.runAsync('DELETE FROM abc_daily_summary WHERE date < ?', [today]);

        // Reset sleep last night since all sessions were deleted
        useSleepStore.setState({ lastNightDuration: null, lastNightQuality: null, recentSessions: [] });
      }

      await hydrateStepStore(db);
      await hydrateSleepStore(db);
      await hydrateWaterStore(db);
      await hydrateCaloriesStore(db);
      await hydrateAbcStore(db);

      setTimeout(() => {
        showSuccess('Success', 'All data has been cleared.');
      }, 100);
    } catch (error) {
      setTimeout(() => {
        showError('Error', 'Failed to clear data. Please try again.');
      }, 100);
    }
  }
}

interface DataClearButtonProps {
  db: any;
  label: string;
  description: string;
  color: string;
  onClearToday: () => Promise<void>;
  onClearExceptToday: () => Promise<void>;
  onClearAll: () => Promise<void>;
}

function DataClearButton({ db, label, description, color, onClearToday, onClearExceptToday, onClearAll }: DataClearButtonProps) {
  const [clearing, setClearing] = useState(false);
  const { showSuccess, showError, showConfirm, showAlert } = useCustomAlert();

  async function runClear(mode: 'today' | 'exceptToday' | 'all') {
    setClearing(true);
    try {
      if (mode === 'today') {
        await onClearToday();
      } else if (mode === 'exceptToday') {
        await onClearExceptToday();
      } else {
        await onClearAll();
      }
      const msg =
        mode === 'today' ? "Today's data has been cleared." :
        mode === 'exceptToday' ? 'All history except today has been cleared.' :
        'All data has been completely cleared.';
      setTimeout(() => showSuccess('Done', msg), 100);
    } catch (error) {
      setTimeout(() => showError('Error', `Failed to clear ${label}. Please try again.`), 100);
    } finally {
      setClearing(false);
    }
  }

  function handleClear() {
    showAlert({
      title: `Clear ${label}`,
      message: 'What would you like to delete?',
      type: 'warning',
      actions: [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Today Only',
          style: 'default',
          onPress: () => setTimeout(() => showConfirm(
            `Clear Today's ${label}`,
            "This will delete only today's data. This cannot be undone.",
            () => runClear('today'),
            'Delete',
            true
          ), 100),
        },
        {
          text: 'All Data',
          style: 'destructive',
          onPress: () => setTimeout(() => showAlert({
            title: 'Include Today?',
            message: "Do you also want to delete today's data?",
            type: 'warning',
            actions: [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Keep Today',
                style: 'default',
                onPress: () => runClear('exceptToday'),
              },
              {
                text: 'Delete Everything',
                style: 'destructive',
                onPress: () => runClear('all'),
              },
            ],
          }), 100),
        },
      ],
    });
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
  dangerSubtext: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
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
  const isFocused = useIsFocused();
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
          // If denied, check if it was ever requested (use unknown if never requested)
          setActivityStatus(result ? 'granted' : 'unknown');
        } catch {
          setActivityStatus('unknown');
        }
      }

      // Notifications
      try {
        const { status } = await Notifications.getPermissionsAsync();
        setNotifStatus(status === 'granted' ? 'granted' : 'unknown');
      } catch {
        setNotifStatus('unknown');
      }

      // Battery optimization
      try {
        const ignored = await isBatteryOptimizationIgnored();
        setBatteryStatus(ignored ? 'granted' : 'unknown');
      } catch {
        setBatteryStatus('unknown');
      }
    }
    
    // Re-check permissions whenever screen is focused
    if (isFocused) {
      checkPermissions();
    }
  }, [isFocused]);

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
      const granted = result === PermissionsAndroid.RESULTS.GRANTED;
      // If not granted after asking, set to 'denied' (user explicitly refused)
      setActivityStatus(granted ? 'granted' : 'denied');
    } catch {
      setActivityStatus('denied');
    }
  }

  async function handleRequestNotifications() {
    const { status } = await Notifications.requestPermissionsAsync();
    // If not granted after asking, set to 'denied'
    setNotifStatus(status === 'granted' ? 'granted' : 'denied');
  }

  function handleRequestBattery() {
    requestIgnoreBatteryOptimizations();
    // Don't optimistically set status - let the focus re-check handle it
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
          actionLabel="Allow"
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
  // Show actionLabel for both 'unknown' and 'denied' when permission is not granted
  const buttonText = status === 'granted' ? null : (
    status === 'unknown' ? actionLabel : 'Retry'
  );
  
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
            {buttonText}
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
