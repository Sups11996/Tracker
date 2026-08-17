import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform, DeviceEventEmitter } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores/userStore';
import { hydrateStepStore, subscribeToStepEvents, unsubscribeFromStepEvents, useStepStore, saveStepData } from '../stores/stepStore';
import { hydrateSleepStore } from '../stores/sleepStore';
import { hydrateWaterStore, useWaterStore } from '../stores/waterStore';
import { hydrateCaloriesStore } from '../stores/caloriesStore';
import { hydrateAbcStore } from '../stores/abcStore';
import { checkDateChanged, getTodayLocal, getYesterdayLocal } from '../lib/dateUtils';

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
  const dbRef = useRef(db);
  useEffect(() => { dbRef.current = db; }, [db]);

  const { profile } = useUserStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasHydratedOnce = useRef(false);
  const [isReady, setIsReady] = useState(false);
  
  // Race condition guards
  const isHydrating = useRef(false);
  const isCheckingDate = useRef(false);

  async function handleDateChangeIfNeeded() {
    const db = dbRef.current;
    // Prevent concurrent date checks
    if (isCheckingDate.current) return false;
    isCheckingDate.current = true;
    
    try {
      if (!db) {
        console.error('[AppHydration] Database not available');
        return false;
      }

      const dateChanged = await checkDateChanged(db);
      if (dateChanged) {
        const yesterdayDate = getYesterdayLocal();
        
        try {
          const state = useStepStore.getState();
          const goalMet = state.todaySteps >= state.dailyGoal ? 1 : 0;
          const now = Date.now();
          
          await db.runAsync(
            `INSERT OR REPLACE INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, 
               COALESCE((SELECT created_at FROM daily_steps WHERE date = ?), ?),
               ?)`,
            [yesterdayDate, state.todaySteps, state.todayDistance, state.todayCalories, state.dailyGoal, goalMet, yesterdayDate, now, now]
          );
          
          await db.runAsync(
            'INSERT OR REPLACE INTO kv_store (key, value) VALUES (?, ?)',
            ['last_known_date', getTodayLocal()]
          );

          // Only reset stores AFTER DB write confirmed — prevents data loss on write failure
          useStepStore.setState({ todaySteps: 0, todayDistance: 0, todayCalories: 0 });
          useWaterStore.setState({ todayTotal: 0, logs: [], undoStack: [] });

          if (StepServiceModule) {
            try {
              await StepServiceModule.sendAction('reset');
            } catch (error) {
              console.error('[AppHydration] Native reset failed:', error);
            }
          }
        } catch (error) {
          console.error('[AppHydration] Save yesterday data failed — stores NOT reset to preserve data:', error);
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error('[AppHydration] Date change check failed:', error);
      return false;
    } finally {
      isCheckingDate.current = false;
    }
  }

  async function hydrateAll() {
    const db = dbRef.current;
    if (isHydrating.current) return;
    isHydrating.current = true;
    
    try {
      if (!db) {
        console.error('[AppHydration] Database not available for hydration');
        return;
      }

      await hydrateStepStore(db);
      await hydrateSleepStore(db);
      await hydrateWaterStore(db);
      await hydrateCaloriesStore(db);
      // Read profile fresh from DB — not from closure — so ABC hydration
      // is never skipped on first launch when profile hasn't loaded yet
      const freshProfile = await db.getFirstAsync<{ uses_abc: number }>(
        'SELECT uses_abc FROM user_profile WHERE id = 1'
      );
      if (freshProfile?.uses_abc === 1) {
        await hydrateAbcStore(db);
      }
      // Cancel any ABC summary notification scheduled by older app versions
      try {
        const { cancelScheduledNotificationAsync } = await import('expo-notifications');
        await cancelScheduledNotificationAsync('abc_daily_summary');
        await db.runAsync('DELETE FROM kv_store WHERE key = ?', ['abc_summary_enabled']);
      } catch (_) {}
    } catch (e) {
      console.error('[AppHydration] Hydrate all stores failed:', e);
    } finally {
      isHydrating.current = false;
    }
  }

  // Initial hydration on mount + date check
  useEffect(() => {
    if (!hasHydratedOnce.current) {
      hasHydratedOnce.current = true;
      (async () => {
        try {
          await handleDateChangeIfNeeded();
          // Always hydrate after date check (whether date changed or not)
          await hydrateAll();
          setIsReady(true);
        } catch (error) {
          console.error('[AppHydration] Initial hydration failed:', error);
          // Set ready anyway to prevent infinite loading
          setIsReady(true);
        }
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
        await saveStepData(dbRef.current);
      }
      
      // Re-hydrate when coming back to foreground
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        // Wait briefly for Expo SQLite to finish reconnecting after app resume
        await new Promise(resolve => setTimeout(resolve, 500));

        try {
          const result = await dbRef.current.getFirstAsync<{ is_tracking: number; is_paused: number }>(
            'SELECT is_tracking, is_paused FROM step_tracking_state WHERE id = 1'
          );
          if (result) {
            const isTracking = result.is_tracking === 1;
            const isPaused = result.is_paused === 1;
            let newStatus: 'tracking' | 'paused' | 'unavailable';
            if (!isTracking) newStatus = 'unavailable';
            else if (isPaused) newStatus = 'paused';
            else newStatus = 'tracking';
            useStepStore.getState().setStatus(newStatus);
          }
        } catch (error) {
          console.error('[AppHydration] Reload tracking status failed:', error);
        }
        
        await handleDateChangeIfNeeded();
        await hydrateAll();
      }
      appState.current = nextState;
    });

    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);  // No deps — hydrateAll reads fresh profile from store inside the callback

  // Save step data when tab switches to Dashboard (triggered by MainTabs)
  useEffect(() => {
    let lastSavedSteps = -1;

    const sub = DeviceEventEmitter.addListener('SAVE_STEPS_NOW', async () => {
      const currentSteps = useStepStore.getState().todaySteps;
      if (currentSteps !== lastSavedSteps) {
        await saveStepData(dbRef.current);
        lastSavedSteps = currentSteps;
      }
    });

    return () => sub.remove();
  }, []);

  // Subscribe to native step events once
  useEffect(() => {
    subscribeToStepEvents();
    return () => {
      unsubscribeFromStepEvents();
    };
  }, []);

  // Periodic auto-save every 30 seconds — only writes if steps changed since last save
  useEffect(() => {
    let lastSavedSteps = -1;

    const interval = setInterval(async () => {
      if (AppState.currentState !== 'active') return;
      await handleDateChangeIfNeeded();
      const currentSteps = useStepStore.getState().todaySteps;
      if (currentSteps !== lastSavedSteps) {
        await saveStepData(dbRef.current);
        lastSavedSteps = currentSteps;
      }
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return { isReady };
}
