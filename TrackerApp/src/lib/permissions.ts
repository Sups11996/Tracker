import { requireNativeModule } from 'expo-modules-core';

/**
 * Native permissions helper module.
 * Wraps Android-specific permission APIs that can't be done from JS/Linking.
 */
const PermissionsModule = requireNativeModule('PermissionsModule');

/**
 * Returns true if the app is already ignoring battery optimizations.
 */
export function isBatteryOptimizationIgnored(): boolean {
  try {
    return PermissionsModule.isBatteryOptimizationIgnored() ?? false;
  } catch {
    return false;
  }
}

/**
 * Opens the system dialog to request battery optimization exemption for this app.
 * This is the correct way — directly targets our package, not the general list.
 */
export function requestIgnoreBatteryOptimizations(): void {
  try {
    PermissionsModule.requestIgnoreBatteryOptimizations();
  } catch (e) {
    console.warn('[permissions] requestIgnoreBatteryOptimizations failed:', e);
  }
}

/**
 * Opens the Usage Access settings screen so user can grant PACKAGE_USAGE_STATS.
 */
export function openUsageAccessSettings(): void {
  try {
    PermissionsModule.openUsageAccessSettings();
  } catch (e) {
    console.warn('[permissions] openUsageAccessSettings failed:', e);
  }
}

/**
 * Opens this app's page in Android system Settings.
 */
export function openAppSettings(): void {
  try {
    PermissionsModule.openAppSettings();
  } catch (e) {
    console.warn('[permissions] openAppSettings failed:', e);
  }
}
