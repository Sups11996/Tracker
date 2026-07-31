import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useUserStore } from '../../stores';
import { hydrateStepStore } from '../../stores/stepStore';
import { hydrateSleepStore } from '../../stores/sleepStore';
import { hydrateWaterStore } from '../../stores/waterStore';
import { hydrateCaloriesStore } from '../../stores/caloriesStore';
import { fetchScreenTimeStats, checkScreenTimePermission } from '../../stores/screenTimeStore';
import { hydrateAbcStore } from '../../stores/abcStore';
import { StepHomeCard } from '../steps/StepHomeCard';
import { SleepHomeCard } from '../sleep/SleepHomeCard';
import { WaterHomeCard } from '../water/WaterHomeCard';
import { CaloriesHomeCard } from '../calories/CaloriesHomeCard';
import { ScreenTimeHomeCard } from '../screentime/ScreenTimeHomeCard';
import { AbcHomeCard } from '../abc/AbcHomeCard';
import { AnimatedCard } from '../../components/ui/AnimatedCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useAppReady } from '../../contexts/AppReadyContext';
import { useSQLiteContext } from 'expo-sqlite';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants';
import type { MainTabParamList, DashboardTab } from '../../types/navigation';

type HomeNav = BottomTabNavigationProp<MainTabParamList, 'Home'>;

export function HomeScreen() {
  const { profile } = useUserStore();
  const navigation = useNavigation<HomeNav>();
  const db = useSQLiteContext();
  const [refreshing, setRefreshing] = useState(false);
  const isReady = useAppReady();

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
      await Promise.all([
        hydrateStepStore(db),
        hydrateSleepStore(db),
        hydrateWaterStore(db),
        hydrateCaloriesStore(db),
        checkScreenTimePermission().then(ok => ok ? fetchScreenTimeStats() : Promise.resolve()),
        profile?.uses_abc ? hydrateAbcStore(db) : Promise.resolve(),
      ]);
    } catch (e) {
      console.error('Refresh failed:', e);
    } finally {
      setRefreshing(false);
    }
  }, [db, profile]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            {greeting}{profile ? `, ${profile.username}` : ''} 👋
          </Text>
          <Text style={styles.date}>
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric',
            })}
          </Text>
        </View>

        {/* Feature cards — each taps to its dashboard tab */}
        {!isReady ? (
          // Show skeleton shimmer cards while hydrating
          <>
            <SkeletonCard lines={4} height={160} />
            <SkeletonCard lines={3} height={130} />
            <SkeletonCard lines={3} height={120} />
            <SkeletonCard lines={3} height={130} />
          </>
        ) : (
          <>
            <AnimatedCard index={0}><StepHomeCard onPress={() => goToDashboard('steps')} /></AnimatedCard>
            <AnimatedCard index={1}><SleepHomeCard onPress={() => goToDashboard('sleep')} /></AnimatedCard>
            <AnimatedCard index={2}><WaterHomeCard onPress={() => goToDashboard('water')} /></AnimatedCard>
            {profile?.uses_gym !== false && (
              <AnimatedCard index={3}><CaloriesHomeCard onPress={() => goToDashboard('calories')} /></AnimatedCard>
            )}
            <AnimatedCard index={4}><ScreenTimeHomeCard onPress={() => goToDashboard('screen')} /></AnimatedCard>
            {profile?.uses_abc && (
              <AnimatedCard index={5}><AbcHomeCard onPress={() => goToDashboard('abc')} /></AnimatedCard>
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
    backgroundColor: 'transparent',
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
});
