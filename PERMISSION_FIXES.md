# Permission Fixes - Boot Receiver & Battery Optimization

## What Was Fixed

### Issue 1: Step Tracking Stops After Phone Reboot ❌ → ✅

**Problem:**
- After rebooting the phone, step tracking completely stopped
- Home tab showed old steps (from database) but didn't count new steps
- Notification showed "0 steps today"
- User had to manually open the app to restart tracking

**Root Cause:**
- `RECEIVE_BOOT_COMPLETED` permission was declared but no `BroadcastReceiver` existed to handle the boot event
- The foreground service (`StepCounterService`) doesn't automatically restart after reboot

**Solution:**
Created `BootReceiver.kt` that:
- Listens for `ACTION_BOOT_COMPLETED` broadcast
- Checks if step tracking was active before reboot (via SharedPreferences)
- Automatically restarts `StepCounterService` using `startForegroundService()`
- Registered in `AndroidManifest.xml`

---

### Issue 2: Battery Optimization Permission Not Working ⚠️ → ✅

**Problem:**
- Battery optimization request relied on non-existent native module
- Fallback using `Linking.openURL()` was unreliable
- System could still kill the step counter service during battery optimization

**Root Cause:**
- `PermissionsModule` was referenced in TypeScript code but didn't exist as a native Kotlin module
- `requestIgnoreBatteryOptimizations()` and `isBatteryOptimizationIgnored()` had no native implementation

**Solution:**
Created complete native module implementation:
1. **`PermissionsModule.kt`** - Native module with 4 methods:
   - `isBatteryOptimizationIgnored()` - Checks current battery exemption status
   - `requestIgnoreBatteryOptimizations()` - Opens system dialog to request exemption
   - `openUsageAccessSettings()` - Opens usage access settings
   - `openAppSettings()` - Opens app settings page

2. **`PermissionsPackage.kt`** - Registers the module with React Native

3. Already registered in `MainApplication.kt` - Package was already added to package list

---

## Files Created

### New Kotlin Files

1. **`TrackerApp/android/app/src/main/java/com/trackerapp/personal/BootReceiver.kt`**
   - BroadcastReceiver for handling device boot
   - Auto-restarts step counter service
   - Checks if tracking was active before reboot

2. **`TrackerApp/android/app/src/main/java/com/trackerapp/personal/PermissionsModule.kt`**
   - Native module for battery optimization and system settings
   - 4 methods exposed to JavaScript
   - Includes fallback mechanisms for different Android versions

3. **`TrackerApp/android/app/src/main/java/com/trackerapp/personal/PermissionsPackage.kt`**
   - Registers PermissionsModule with React Native
   - Already integrated in MainApplication.kt

### Modified Files

4. **`TrackerApp/android/app/src/main/AndroidManifest.xml`**
   - Added `<receiver>` entry for `BootReceiver`
   - Configured to listen for `BOOT_COMPLETED` action

---

## How It Works

### Boot Flow

```
Phone Reboots
    ↓
System broadcasts ACTION_BOOT_COMPLETED
    ↓
BootReceiver.onReceive() triggered
    ↓
Check SharedPreferences: Was step tracking active?
    ↓ YES
Start StepCounterService as foreground service
    ↓
Service shows notification
    ↓
Step tracking continues seamlessly
```

### Battery Optimization Flow

```
User taps "Allow" in Settings/Onboarding
    ↓
JavaScript calls PermissionsModule.requestIgnoreBatteryOptimizations()
    ↓
Native module opens system dialog (ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
    ↓
User grants exemption
    ↓
App can now run in background without being killed by battery saver
```

---

## Testing Instructions

### Test 1: Boot Receiver

1. Open the app and start step tracking
2. Walk around to generate some steps
3. **Reboot the phone**
4. After boot completes, check:
   - ✅ Notification should show "X steps today"
   - ✅ Home tab should count new steps
   - ✅ No need to open the app

**Expected:** Service automatically restarts and continues counting

### Test 2: Battery Optimization

1. Go to Settings → Permissions in the app
2. Tap "Battery Optimization" → "Allow"
3. System dialog should open
4. Grant permission
5. Go back to app
6. Status should show "Granted" with green checkmark

**Expected:** Permission dialog works correctly without errors

### Test 3: Combined (Real-World Scenario)

1. Grant battery optimization exemption
2. Start step tracking
3. Lock phone and let it sit overnight
4. Reboot phone
5. Walk around without opening the app

**Expected:** 
- Service survives overnight (battery exemption working)
- Service restarts after reboot (boot receiver working)
- Steps counted accurately

---

## Technical Details

### BootReceiver Implementation

**Key Features:**
- Only restarts service if it was previously active (checks `PREF_STEPS >= 0`)
- Uses `startForegroundService()` for Android 8.0+ compatibility
- Logs all actions for debugging
- Handles exceptions gracefully

**Android Version Support:**
- API 21+ (Android 5.0+): Full support
- Automatically handles API level differences

### PermissionsModule Implementation

**Methods Exposed to JavaScript:**

| Method | Return Type | Description |
|--------|-------------|-------------|
| `isBatteryOptimizationIgnored()` | `Promise<boolean>` | Checks if app is exempted from battery optimization |
| `requestIgnoreBatteryOptimizations()` | `void` | Opens system dialog to request exemption |
| `openUsageAccessSettings()` | `void` | Opens Usage Access settings screen |
| `openAppSettings()` | `void` | Opens app's system settings page |

**Fallback Strategy:**
1. Try specific intent (e.g., `ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)
2. If fails, try general intent (e.g., `ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS`)
3. If fails, open app settings (`ACTION_APPLICATION_DETAILS_SETTINGS`)
4. If fails, open general settings (`ACTION_SETTINGS`)

---

## Permission Status Summary

| Permission | Status | Auto-Restart After Reboot? |
|------------|--------|----------------------------|
| `ACTIVITY_RECOGNITION` | ✅ Working | N/A |
| `FOREGROUND_SERVICE` | ✅ Working | ✅ YES (via BootReceiver) |
| `POST_NOTIFICATIONS` | ✅ Working | N/A |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | ✅ Fixed | N/A |
| `RECEIVE_BOOT_COMPLETED` | ✅ Fixed | ✅ YES |

---

## Build Instructions

Since these are native Android changes, you need to rebuild the app:

```bash
cd ~/Documents/Tracker/TrackerApp/android

# Clean previous builds
rm -rf app/.cxx .gradle app/build
./gradlew clean

# Build new APK with boot receiver
./gradlew assembleRelease
```

**APK Location:**
```
TrackerApp/android/app/build/outputs/apk/release/app-release.apk
```

---

## Version Info

- **Previous Version:** 1.1.0 (versionCode 2)
- **This Build:** 1.1.0 (versionCode 2) - Same version, bug fixes only
- **If releasing separately:** Bump to 1.1.1 (versionCode 3)

---

## Notes

- The `android/` folder is in `.gitignore`, so these changes won't appear in git status
- To share these fixes, the entire `android/` folder structure needs to be included in releases
- BootReceiver requires the app to have been opened at least once after installation
- Battery optimization exemption must be manually granted by the user (Android security requirement)
- Both fixes work on Android 5.0 (API 21) and above

---

## Troubleshooting

### If boot receiver doesn't work:

1. Check if permission is granted:
   ```
   Settings → Apps → Tracker → Permissions
   Verify "Autostart" or "Boot" permission is enabled
   ```

2. Check if battery optimization is disabled:
   ```
   Settings → Battery → Battery Optimization
   Find "Tracker" → Select "Don't optimize"
   ```

3. Check logs after reboot:
   ```bash
   adb logcat | grep BootReceiver
   ```

### If battery optimization fails:

1. Try granting manually:
   ```
   Settings → Battery → Battery Optimization → Tracker → Don't optimize
   ```

2. Check manufacturer-specific battery settings:
   - Samsung: Device Care → Battery → App power management
   - Xiaomi: Battery → App battery saver → Tracker → No restrictions
   - Huawei: Battery → App launch → Tracker → Manual → Enable all

---

## Related Documentation

- See `BUILD_INSTRUCTIONS.md` for complete build guide
- See `QUICK_START.md` for TL;DR build instructions
- See `README.md` for project overview
