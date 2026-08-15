# Quick Start Guide

## TL;DR for Experienced Developers

```bash
# 1. Clone and install
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp
npm install  # Auto-patches native modules AND cleans build artifacts

# 2. Build APK
cd android
./gradlew assembleRelease

# 3. Install
adb install app/build/outputs/apk/release/app-release.apk

# If adb command not found, use full path (replace <YourName>):
# "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools\adb.exe" install app/build/outputs/apk/release/app-release.apk
```

**Output:** `android/app/build/outputs/apk/release/app-release.apk`

**That's it!** No need to manually clean or run additional scripts.

## Requirements

- Node.js 18+
- JDK 17
- Android SDK with:
  - NDK **27.1.12297006** (exact version)
  - CMake 3.22.1
  - Build-Tools 34.0.0+
- `ANDROID_HOME` and `JAVA_HOME` environment variables set

## First Time Setup

1. **Install Android Studio** → SDK Manager → SDK Tools tab:
   - Check "Show Package Details"
   - Install NDK (Side by side) version **27.1.12297006**
   - Install CMake 3.22.1

2. **Set environment variables:**
   ```bash
   ANDROID_HOME=C:\Users\<YourName>\AppData\Local\Android\Sdk
   JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot
   ```

3. **Verify setup:**
   ```bash
   node --version  # Should be 18+
   java -version   # Should be 17
   adb --version   # Should work
   ```
   
   **Note:** If `adb` is not recognized, use full path (replace `<YourName>`):
   ```bash
   "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools\adb.exe" --version
   ```

## What Happens During `npm install`

The `postinstall` script automatically:

**1. Patches 8 native modules** for Android NDK 27 compatibility by adding C++ standard library (`c++_shared`) linking:
- `react-native-gesture-handler`
- `react-native-screens`
- `react-native-worklets`
- `react-native-reanimated`
- `react-native-svg`
- `react-native-safe-area-context`
- `expo-sqlite`
- `expo-modules-core` (jsi.cmake)

**2. Cleans build artifacts** to prevent build errors:
- Removes `.cxx` directories (CMake build cache)
- Removes `build` directories from native modules
- Removes `android/app/.cxx` and `android/app/build`

**Result:** Fresh, clean environment ready to build!

## Troubleshooting

### Build fails with C++ linking errors?
```bash
# Simply re-run npm install (it will re-patch and clean)
cd TrackerApp
npm install

# Then build
cd android
./gradlew assembleRelease
```

### NDK not found?
Ensure NDK **27.1.12297006** is installed (not newer or older versions).

### Out of memory?
Edit `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

## For Complete Instructions

See [BUILD_INSTRUCTIONS.md](BUILD_INSTRUCTIONS.md) for detailed guide.
