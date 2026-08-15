import React, { useCallback, useEffect, useState } from 'react';
import {
  NativeModules,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../stores';
import { hydrateStepStore } from '../../stores/stepStore';
import { hydrateSleepStore } from '../../stores/sleepStore';
import { hydrateWaterStore } from '../../stores/waterStore';
import { hydrateCaloriesStore } from '../../stores/caloriesStore';
import { hydrateAbcStore } from '../../stores/abcStore';
import { StepHomeCard } from '../steps/StepHomeCard';
import { SleepHomeCard } from '../sleep/SleepHomeCard';
import { WaterHomeCard } from '../water/WaterHomeCard';
import { CaloriesHomeCard } from '../calories/CaloriesHomeCard';
import { AbcHomeCard } from '../abc/AbcHomeCard';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useAppReady } from '../../contexts/AppReadyContext';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import type { MainTabParamList, DashboardTab } from '../../types/navigation';

// Use classic NativeModules bridge
const StepServiceModule = Platform.OS === 'android' ? NativeModules.StepServiceModule : null;

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const { profile } = useUserStore();
  const navigation = useNavigation<HomeNav>();
  const db = useSQLiteContext();
  const [refreshing, setRefreshing] = useState(false);
  const isReady = useAppReady();
  const isFocused = useIsFocused();
  const tabBarHeight = useBottomTabBarHeight();
  
  // Loading state for smooth transitions (similar to Dashboard/Settings)
  const [isLoading, setIsLoading] = useState(true);

  // Show skeleton when first mounting or when returning to tab
  useEffect(() => {
    if (isFocused) {
      setIsLoading(true);
      const timer = setTimeout(() => setIsLoading(false), 100); // Reduced from 150ms
      return () => clearTimeout(timer);
    }
  }, [isFocused]);

  // Start step tracking service on mount (Android only) — only if tracking is enabled in DB
  useEffect(() => {
    async function startTrackingIfEnabled() {
      if (Platform.OS !== 'android') return;
      if (!StepServiceModule) return;
      if (!isReady) return; // Wait for app hydration to complete

      try {
        // Check if tracking is enabled in DB
        const state = await db.getFirstAsync<{ is_tracking: number }>(
          'SELECT is_tracking FROM step_tracking_state WHERE id = 1'
        );
        if (!state || state.is_tracking !== 1) return;

        // Check if notification permission granted (required for foreground service)
        const Notifications = require('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== 'granted') return;

        await StepServiceModule.startService();
      } catch (error) {
        console.error('[HomeScreen] Start tracking service failed:', error);
        // Step service failed to start - silently continue
      }
    }

    startTrackingIfEnabled();
  }, [db, isReady]);

  const hour = new Date().getHours();
  const greeting =
    hour < 5  ? 'Good night' :
    hour < 12 ? 'Good morning' :
    hour < 17 ? 'Good afternoon' :
    hour < 21 ? 'Good evening' : 'Good night';

  function goToDashboard(tab: DashboardTab) {
    navigation.navigate('Dashboard', { tab });
  }

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Run sequentially to avoid SQLite conflicts
      await hydrateStepStore(db);
      await hydrateSleepStore(db);
      await hydrateWaterStore(db);
      await hydrateCaloriesStore(db);
      if (profile?.uses_abc) {
        await hydrateAbcStore(db);
      }
    } catch (e) {
      console.error('[HomeScreen] Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, [db, profile]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.textMuted}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>
            {greeting}{profile ? `, ${profile.username}` : ''}
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>
          <Text style={styles.disclaimer}>
            Step counts are based on hardware sensor data and may have some variance
          </Text>
        </View>

        {/* Feature cards — each taps to its dashboard tab */}
        {/* Show skeleton shimmer cards while hydrating OR during tab transitions */}
        {(!isReady || isLoading) ? (
          // Show skeleton shimmer cards while hydrating
          <>
            <SkeletonCard lines={4} height={160} />
            <SkeletonCard lines={3} height={130} />
            <SkeletonCard lines={3} height={120} />
            <SkeletonCard lines={3} height={130} />
            <SkeletonCard lines={2} height={100} />
            <SkeletonCard lines={5} height={180} />
          </>
        ) : (
          <>
            <AnimatedCard index={0}><StepHomeCard onPress={() => goToDashboard('steps')} /></AnimatedCard>
            <AnimatedCard index={1}><SleepHomeCard onPress={() => goToDashboard('sleep')} /></AnimatedCard>
            <AnimatedCard index={2}><WaterHomeCard onPress={() => goToDashboard('water')} /></AnimatedCard>
            {profile?.uses_gym !== false && (
              <AnimatedCard index={3}><CaloriesHomeCard onPress={() => goToDashboard('calories')} /></AnimatedCard>
            )}
            {!!profile?.uses_abc && (
              <AnimatedCard index={4}><AbcHomeCard onPress={() => goToDashboard('abc')} /></AnimatedCard>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  content: {
    padding: SPACING.xl,
    gap: SPACING.lg,
    paddingBottom: SPACING.huge,
  },
  header: { gap: SPACING.xs },
  greeting: {
    fontSize: TYPOGRAPHY.size.xxl,
    fontWeight: TYPOGRAPHY.weight.bold,
    color: COLORS.textPrimary,
  },
  date: {
    fontSize: TYPOGRAPHY.size.sm,
    color: COLORS.textMuted,
  },
  disclaimer: {
    fontSize: TYPOGRAPHY.size.xs,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    opacity: 0.6,
  },
});
