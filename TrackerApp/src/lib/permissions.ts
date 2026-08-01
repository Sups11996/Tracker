import { Linking, Platform } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';

/**
 * Native permissions helper module.
 * Wraps Android-specific permission APIs that can't be done from JS/Linking.
 */
const PermissionsModule = (() => {
  try {
    return requireNativeModule('PermissionsModule');
  } catch {
    return null;
  }
})();

/**
 * Returns true if the app is already ignoring battery optimizations.
 */
export function isBatteryOptimizationIgnored(): boolean {
  if (!PermissionsModule) return false;
  try {
    return PermissionsModule.isBatteryOptimizationIgnored() ?? false;
  } catch {
    return false;
  }
}

/**
 * Opens the system dialog to request battery optimization exemption for this app.
 * Falls back to Linking if native module is unavailable.
 */
export function requestIgnoreBatteryOptimizations(): void {
  if (PermissionsModule) {
    try {
      PermissionsModule.requestIgnoreBatteryOptimizations();
      return;
    } catch (e) {
      console.warn('[permissions] requestIgnoreBatteryOptimizations native failed:', e);
    }
  }
  // Fallback: open via Linking deep link
  if (Platform.OS === 'android') {
    Linking.openURL('package:' + 'com.trackerapp.personal').catch(() => {
      Linking.openSettings().catch(() => {});
    });
  }
}

/**
 * Opens the Usage Access settings screen so user can grant PACKAGE_USAGE_STATS.
 * Falls back to Linking if native module is unavailable.
 */
export function openUsageAccessSettings(): void {
  if (PermissionsModule) {
    try {
      PermissionsModule.openUsageAccessSettings();
      return;
    } catch (e) {
      console.warn('[permissions] openUsageAccessSettings native failed:', e);
    }
  }
  // Fallback via Linking
  if (Platform.OS === 'android') {
    Linking.openURL('android.settings.USAGE_ACCESS_SETTINGS').catch(() => {
      Linking.openSettings().catch(() => {});
    });
  }
}

/**
 * Opens this app's page in Android system Settings.
 */
export function openAppSettings(): void {
  if (!PermissionsModule) return;
  try {
    PermissionsModule.openAppSettings();
  } catch (e) {
    console.warn('[permissions] openAppSettings failed:', e);
  }
}
