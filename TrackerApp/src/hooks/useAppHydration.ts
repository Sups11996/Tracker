import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { useUserStore } from '../stores/userStore';
import { hydrateStepStore, subscribeToStepEvents, unsubscribeFromStepEvents } from '../stores/stepStore';
import { hydrateSleepStore } from '../stores/sleepStore';
import { hydrateWaterStore } from '../stores/waterStore';
import { hydrateCaloriesStore } from '../stores/caloriesStore';
import { hydrateAbcStore } from '../stores/abcStore';

/**
 * Central app hydration hook.
 *
 * - On mount: hydrates all stores from SQLite once on app start.
 * - On foreground: re-hydrates all stores when app comes back from background
 *   (covers phone restart + OS-kill recovery — stores would be empty after kill).
 * - On mount: subscribes to native step events; cleans up on unmount.
 *
 * Returns `isReady` — false during first hydration, true afterwards.
 */
export function useAppHydration(): { isReady: boolean } {
  const db = useSQLiteContext();
  const { profile } = useUserStore();
  const appState = useRef<AppStateStatus>(AppState.currentState);
  const hasHydratedOnce = useRef(false);
  const [isReady, setIsReady] = useState(false);

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

  // Initial hydration on mount
  useEffect(() => {
    if (!hasHydratedOnce.current) {
      hasHydratedOnce.current = true;
      hydrateAll().finally(() => setIsReady(true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-hydrate on foreground (covers restart / OS kill / tab switch back)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        hydrateAll();
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
