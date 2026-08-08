# Building Android Release APK

This guide explains how to build the unsigned release APK for this React Native Expo app on **Windows**.

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **Java Development Kit (JDK) 17**
   - Download: https://adoptium.net/temurin/releases/?version=17
   - Set `JAVA_HOME` environment variable to JDK installation path
   - Verify: `java -version`

3. **Android Studio** (latest version)
   - Download from: https://developer.android.com/studio
   - During installation, ensure these components are selected:
     - Android SDK
     - Android SDK Platform
     - Android Virtual Device (optional, for testing)

### Android SDK Setup

After installing Android Studio:

1. **Open Android Studio** → More Actions → SDK Manager

2. **SDK Platforms tab:**
   - Install **Android 14.0 (API 34)** or higher

3. **SDK Tools tab:**
   - Check "Show Package Details" at bottom right
   - Install these exact versions:
     - **NDK (Side by side)** version **27.1.12297006** - CRITICAL: must be exact version
     - **CMake** version 3.22.1
     - **Android SDK Build-Tools** (v34.0.0 or higher)
     - Android SDK Command-line Tools (latest)
     - Android SDK Platform-Tools (latest)

### Environment Variables

Set these environment variables (System Properties → Advanced → Environment Variables):

1. **ANDROID_HOME**
   ```
   C:\Users\<YourName>\AppData\Local\Android\Sdk
   ```

2. **Add to PATH:**
   ```
   %ANDROID_HOME%\platform-tools
   %ANDROID_HOME%\tools
   %ANDROID_HOME%\tools\bin
   ```

3. **Verify setup:**
   ```bash
   adb --version
   ```
   
   **Note:** If `adb` command is not recognized:
   - **Option 1:** Use full path:
     ```bash
     "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools\adb.exe" --version
     ```
   - **Option 2:** Navigate to platform-tools:
     ```bash
     cd "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools"
     adb --version
     ```
   - **Option 3:** Add to PATH permanently (see Environment Variables above) and restart terminal

## Building the APK

### Step 1: Clone the Repository

```bash
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp
```

### Step 2: Install Dependencies

```bash
npm install
```

**What happens during `npm install`:**
- Downloads all Node.js dependencies
- Automatically runs `postinstall` script that patches native modules
- Patches applied:
  - `react-native-gesture-handler` - adds C++ stdlib linking
  - `expo-modules-core` - adds C++ stdlib linking to JSI module

You should see output like:
```
🔧 Patching native modules for Android NDK 27...
✓ Patched react-native-gesture-handler
✓ Patched expo-modules-core/jsi.cmake
✅ Native module patching complete!
```

### Step 3: Clean Build (Recommended for first build)

```bash
cd android
rm -rf app/.cxx
rm -rf .gradle
rm -rf app/build
./gradlew clean
```

### Step 4: Build Release APK

```bash
./gradlew assembleRelease
```

**Build time:** 
- First build: ~8-10 minutes
- Subsequent builds: ~2-3 minutes

**Expected output:**
```
BUILD SUCCESSFUL in ...
... actionable tasks: ... executed, ... up-to-date
```

### Step 5: Locate the APK

The unsigned release APK will be at:
```
android/app/build/outputs/apk/release/app-release.apk
```

## Testing the APK

### Install on Android Device

1. **Enable USB Debugging:**
   - Settings → About Phone → Tap "Build Number" 7 times
   - Settings → Developer Options → Enable USB Debugging

2. **Connect device via USB and install:**
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```
   
   **If `adb` command not found:**
   ```bash
   # Option 1: Use full path (replace <YourName> with your Windows username)
   "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools\adb.exe" install android/app/build/outputs/apk/release/app-release.apk
   
   # Option 2: Navigate to platform-tools first
   cd "C:\Users\<YourName>\AppData\Local\Android\Sdk\platform-tools"
   adb install <full-path-to-apk>
   ```

**Note:** Physical device required for step tracking (step sensor unavailable on emulators)

## Troubleshooting

### Build Fails with "NDK not found"

**Solution:** Install NDK version 27.1.12297006 specifically:
1. Android Studio → SDK Manager → SDK Tools tab
2. Check "Show Package Details"
3. Find NDK (Side by side) → select 27.1.12297006
4. Click Apply

### Build Fails with C++ Linking Errors

**Symptoms:**
```
ld.lld: error: undefined symbol: operator new(unsigned long)
ld.lld: error: undefined symbol: std::__ndk1::...
```

**Solution:**
1. Verify postinstall script ran during `npm install`
2. Manually run the patch script:
   ```bash
   node scripts/patch-native-modules.js
   ```
3. Clean and rebuild:
   ```bash
   cd android
   rm -rf app/.cxx app/build .gradle
   ./gradlew clean
   ./gradlew assembleRelease
   ```

### Build Fails with "JAVA_HOME not set"

**Solution:**
1. Install JDK 17
2. Set JAVA_HOME environment variable:
   ```
   JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot
   ```
3. Restart terminal/IDE

### Gradle Daemon Issues

**Solution:**
```bash
cd android
./gradlew --stop
./gradlew clean
./gradlew assembleRelease
```

### Out of Memory During Build

**Solution:**
Edit `android/gradle.properties` and increase memory:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

## Technical Notes

### Why These Patches Are Needed

- **Android NDK 27** requires explicit linking of `c++_shared` library
- Some React Native modules don't include this in their CMakeLists.txt
- The postinstall script adds `c++_shared` to `target_link_libraries`
- Gradle build configuration also sets global CMake linker flags

### Build Configuration

Key build settings in `android/app/build.gradle`:

```gradle
defaultConfig {
    ndk {
        abiFilters "armeabi-v7a", "arm64-v8a"
    }
    externalNativeBuild {
        cmake {
            arguments "-DANDROID_STL=c++_shared"
            arguments "-DCMAKE_SHARED_LINKER_FLAGS=-lc++_shared"
            arguments "-DCMAKE_EXE_LINKER_FLAGS=-lc++_shared"
        }
    }
}
```

### Supported Architectures

The APK includes native libraries for:
- `armeabi-v7a` (32-bit ARM)
- `arm64-v8a` (64-bit ARM)

**Note:** x86/x86_64 architectures are excluded to avoid Windows-specific build issues.

## Additional Resources

- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Documentation](https://docs.expo.dev/)
- [Android Developer Guide](https://developer.android.com/studio/build/building-cmdline)
- [NDK Documentation](https://developer.android.com/ndk/guides)

## Getting Help

If you encounter issues:

1. Check that **all prerequisites** are installed with correct versions
2. Verify **NDK 27.1.12297006** is installed (not newer or older)
3. Ensure **postinstall script** ran successfully
4. Try a **clean build** (delete build folders and rebuild)
5. Check **environment variables** are set correctly

For project-specific issues, please open an issue on the repository.
