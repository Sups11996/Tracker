import { create } from 'zustand';
import { Platform, NativeModules } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

const UsageStatsModule = (() => {
  if (Platform.OS !== 'android') return null;
  try {
    const m = requireNativeModule('UsageStatsModule');
    if (m) return m;
  } catch {}
  // Fallback to classic NativeModules bridge
  return NativeModules.UsageStatsModule ?? null;
})();

export interface UsageSession {
  start: number;
  end: number;
}

export interface AppUsage {
  packageName: string;
  appName: string;
  totalTimeMs: number;
  sessions: UsageSession[];
}

export interface ScreenTimeStats {
  totalScreenTimeMs: number;
  unlockCount: number;
  apps: AppUsage[];
}

interface ScreenTimeState {
  hasPermission: boolean;
  totalScreenTimeMs: number;
  unlockCount: number;
  apps: AppUsage[];
  mostUsedApp: AppUsage | null;
  setPermission: (hasPermission: boolean) => void;
  setStats: (stats: ScreenTimeStats) => void;
}

export const useScreenTimeStore = create<ScreenTimeState>((set) => ({
  hasPermission: false,
  totalScreenTimeMs: 0,
  unlockCount: 0,
  apps: [],
  mostUsedApp: null,

  setPermission: (hasPermission) => set({ hasPermission }),

  setStats: (stats) => {
    const mostUsed = stats.apps.length > 0 ? stats.apps[0] : null;
    set({
      totalScreenTimeMs: stats.totalScreenTimeMs,
      unlockCount: stats.unlockCount,
      apps: stats.apps,
      mostUsedApp: mostUsed,
    });
  },
}));

/**
 * Check if the app has Usage Access permission.
 */
export async function checkScreenTimePermission(): Promise<boolean> {
  if (Platform.OS !== 'android' || !UsageStatsModule) return false;
  
  try {
    const hasPermission = await UsageStatsModule.hasPermission();
    useScreenTimeStore.setState({ hasPermission });
    return hasPermission;
  } catch (error) {
    console.error('Failed to check screen time permission:', error);
    return false;
  }
}

/**
 * Open Android settings for user to grant Usage Access permission.
 */
export async function requestScreenTimePermission(): Promise<void> {
  if (Platform.OS !== 'android' || !UsageStatsModule) return;
  
  try {
    await UsageStatsModule.requestPermission();
  } catch (error) {
    console.error('Failed to request screen time permission:', error);
  }
}

/**
 * Fetch today's screen time stats from native.
 */
export async function fetchScreenTimeStats(): Promise<void> {
  if (Platform.OS !== 'android' || !UsageStatsModule) return;
  
  try {
    const stats = await UsageStatsModule.fetchTodayStats();
    
    if (stats) {
      useScreenTimeStore.getState().setStats({
        totalScreenTimeMs: stats.totalScreenTimeMs,
        unlockCount: stats.unlockCount,
        apps: stats.apps,
      });
    }
  } catch (error) {
    console.error('Failed to fetch screen time stats:', error);
  }
}

/**
 * Format milliseconds to hours and minutes.
 */
export function formatScreenTime(ms: number): string {
  const totalMinutes = Math.floor(ms / 1000 / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
