import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores/userStore';
import { hydrateStepStore, subscribeToStepEvents, unsubscribeFromStepEvents, useStepStore, saveStepData } from '../stores/stepStore';
import { hydrateSleepStore } from '../stores/sleepStore';
import { hydrateWaterStore, useWaterStore } from '../stores/waterStore';
import { hydrateCaloriesStore } from '../stores/caloriesStore';
import { hydrateAbcStore } from '../stores/abcStore';
import { checkDateChanged, getTodayLocal } from '../lib/dateUtils';

const StepServiceModule = Platform.OS === 'android' ? NativeModules.StepServiceModule : null;

/**
 * Central app hydration hook.
 *
 * - On mount: hydrates all stores from SQLite once on app start.
 * - On foreground: re-hydrates all stores when app comes back from background
 *   (covers phone restart + OS-kill recovery — stores would be empty after kill).
 * - On mount: subscribes to native step events; cleans up on unmount.
 * - Date change detection: Resets daily counters when date changes (e.g., user changes phone date)
 *
 * Returns `isReady` — false during first hydration, true afterwards.
 */
export function useAppHydration(): { isReady: boolean } {
  const db = useSQLiteContext();
  const { profile } = useUserStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasHydratedOnce = useRef(false);
  const [isReady, setIsReady] = useState(false);

  async function handleDateChangeIfNeeded() {
    const dateChanged = await checkDateChanged(db);
    if (dateChanged) {
      console.log('📅 Date changed detected - saving yesterday\'s step data before reset');
      
      // Get yesterday's date (the day that just ended)
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const year = yesterday.getFullYear();
      const month = String(yesterday.getMonth() + 1).padStart(2, '0');
      const day = String(yesterday.getDate()).padStart(2, '0');
      const yesterdayDate = `${year}-${month}-${day}`;
      
      // Save yesterday's step data with yesterday's date
      const state = useStepStore.getState();
      const goalMet = state.todaySteps >= state.dailyGoal ? 1 : 0;
      const now = Date.now();
      
      try {
        await db.runAsync(
          `INSERT OR REPLACE INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 
             COALESCE((SELECT created_at FROM daily_steps WHERE date = ?), ?),
             ?)`,
          [yesterdayDate, state.todaySteps, state.todayDistance, state.todayCalories, state.dailyGoal, goalMet, yesterdayDate, now, now]
        );
        console.log('✅ Yesterday\'s step data saved:', yesterdayDate);
      } catch (error) {
        console.error('❌ Failed to save yesterday\'s data:', error);
      }
      
      // Reset step counter in store
      console.log('🔄 Resetting step counters to 0 for new day');
      useStepStore.setState({ todaySteps: 0, todayDistance: 0, todayCalories: 0 });

      // Reset water in store
      useWaterStore.setState({ todayTotal: 0, logs: [], undoStack: [] });

      // Tell native step service to reset
      if (StepServiceModule) {
        try {
          console.log('📱 Sending reset to native step service');
          await StepServiceModule.sendAction('reset');
          console.log('✅ Native step service reset');
        } catch (error) {
          console.error('❌ Failed to reset native service:', error);
        }
      }
      
      // Re-hydrate to load new day data
      await hydrateAll();
    }
  }

  async function hydrateAll() {
    try {
      await Promise.all([
        hydrateStepStore(db),
        hydrateSleepStore(db),
        hydrateWaterStore(db),
        hydrateCaloriesStore(db),
        profile?.uses_abc ? hydrateAbcStore(db) : Promise.resolve(),
      ]);
    } catch (e) {
      // Silent fail - app will retry on next focus
    }
  }

  // Initial hydration on mount + date check
  useEffect(() => {
    if (!hasHydratedOnce.current) {
      hasHydratedOnce.current = true;
      (async () => {
        await handleDateChangeIfNeeded();
        await hydrateAll();
        setIsReady(true);
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-hydrate on foreground (covers restart / OS kill / tab switch back) + date check
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      // Save step data when going to background
      if (
        appState.current === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        console.log('📱 App going to background - saving step data');
        await saveStepData(db);
      }
      
      // Re-hydrate when coming back to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        await handleDateChangeIfNeeded();
        await hydrateAll();
      }
      appState.current = nextState;
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uses_abc]);

  // Subscribe to native step events once
  useEffect(() => {
    subscribeToStepEvents();
    return () => {
      unsubscribeFromStepEvents();
    };
  }, []);

  // Periodic auto-save every 5 minutes while app is active
  useEffect(() => {
    const interval = setInterval(async () => {
      if (AppState.currentState === 'active') {
        console.log('⏰ Periodic auto-save - saving step data');
        await saveStepData(db);
      }
    }, 5 * 60 * 1000); // 5 minutes in milliseconds

    return () => clearInterval(interval);
  }, [db]);

  return { isReady };
}
