import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, NativeModules, Platform } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores/userStore';
import { hydrateStepStore, subscribeToStepEvents, unsubscribeFromStepEvents, useStepStore } from '../stores/stepStore';
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
    const dateChanged = await checkDateChanged();
    if (dateChanged) {
      console.log('📅 Date changed detected - resetting daily counters');
      
      // Reset step counter in store
      useStepStore.setState({ todaySteps: 0, todayDistance: 0, todayCalories: 0 });
      
      // Reset water in store
      useWaterStore.setState({ todayTotal: 0, logs: [], undoStack: [] });
      
      // Tell native step service to reset
      if (StepServiceModule) {
        try {
          await StepServiceModule.sendAction('reset');
        } catch (error) {
          console.warn('Failed to reset step service:', error);
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
      console.warn('[useAppHydration] hydration error:', e);
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

  return { isReady };
}
