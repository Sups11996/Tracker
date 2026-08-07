# Building Tracker App

## Release Build (Unsigned APK)

### Prerequisites
- Node.js installed
- Android SDK installed
- Java JDK 17 or higher

### Build Steps

#### Option 1: Using Build Script (Windows)
```bash
# Run the build script
.\build-release.bat
```

#### Option 2: Manual Build
```bash
# Navigate to android directory
cd android

# Clean previous builds
gradlew.bat clean

# Build release APK
gradlew.bat assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

#### Option 3: Using Expo
```bash
# Build locally with EAS
npx eas build --platform android --local --profile preview
```

### Output
- **APK Location**: `android/app/build/outputs/apk/release/app-release.apk`
- **APK Type**: Unsigned release build (signed with debug keystore)
- **ABIs Included**: `armeabi-v7a`, `arm64-v8a` (ARM devices only)

### Installation
```bash
# Install on connected device via ADB
adb install android/app/build/outputs/apk/release/app-release.apk
```

Or manually transfer the APK to your device and install it.

## Build Configuration

### Current Settings
- **Minify Enabled**: Yes (ProGuard/R8 optimization)
- **Shrink Resources**: No (disabled for faster builds)
- **Bundle Compression**: No
- **PNG Crunch**: Yes
- **Hermes Engine**: Enabled
- **New Architecture**: Enabled
- **Signing**: Debug keystore (no signing required)

### Optimizations Applied
- Code minification with R8
- Dead code elimination
- PNG optimization
- Hermes bytecode compilation
- Only ARM ABIs (smaller APK size)

## Production Signing (Optional)

For Google Play Store release, you need to sign with a production keystore:

1. Generate keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore tracker-release.keystore -alias tracker-key -keyalg RSA -keysize 2048 -validity 10000
```

2. Update `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=tracker-release.keystore
MYAPP_RELEASE_KEY_ALIAS=tracker-key
MYAPP_RELEASE_STORE_PASSWORD=your_store_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

3. Update `android/app/build.gradle`:
```gradle
signingConfigs {
    release {
        storeFile file(MYAPP_RELEASE_STORE_FILE)
        storePassword MYAPP_RELEASE_STORE_PASSWORD
        keyAlias MYAPP_RELEASE_KEY_ALIAS
        keyPassword MYAPP_RELEASE_KEY_PASSWORD
    }
}
```

## Troubleshooting

### Build Fails with Out of Memory
Increase heap size in `android/gradle.properties`:
```properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m
```

### Native Module Errors
Clean and rebuild:
```bash
cd android
gradlew.bat clean
cd ..
npm run android
```

### APK Too Large
- Disable unnecessary ABIs
- Enable resource shrinking: `android.enableShrinkResourcesInReleaseBuilds=true`
- Enable bundle compression: `android.enableBundleCompression=true`
