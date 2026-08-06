# Tracker

A personal health tracking app built with React Native (Expo) for Android. Tracks steps, sleep, water intake, and calories — all stored locally on the device.

## Features

- **Steps** — Real-time step counting via Android foreground service, daily goal tracking, weekly and monthly graphs
- **Sleep** — Session-based sleep tracking with bedtime/wake reminders, goal tracking
- **Water** — Glass-based water intake logging with custom containers, daily goal
- **Calories** — Walking calories (from steps) + manual workout logging
- **ABC** — Custom daily counter with optional daily summary notification
- **Dashboards** — Weekly bar charts, monthly week-by-week breakdown, month selector with stats

## Tech Stack

- React Native + Expo (bare workflow)
- TypeScript
- Zustand (state management)
- expo-sqlite (local database)
- expo-notifications (reminders)
- Custom Android native module for step counting (`StepCounterService.kt`)

## Prerequisites

- Node.js 18+
- Android Studio + Android SDK
- Java 17
- A physical Android device (step counter requires real hardware sensor)

## Setup

```bash
# Install dependencies
npm install

# Start Metro bundler
npx expo start
```

## Building

### Debug build (development)
```bash
npx expo run:android
```

### Release build (unsigned)
```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

Install on device:
```bash
adb install android/app/build/outputs/apk/release/app-release-unsigned.apk
```

### Release build (signed)

1. Generate a keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Add to `android/app/build.gradle` under `signingConfigs`:
```gradle
signingConfigs {
    release {
        storeFile file('../../my-release-key.keystore')
        storePassword 'your-password'
        keyAlias 'my-key-alias'
        keyPassword 'your-password'
    }
}
```

3. Build:
```bash
cd android
./gradlew assembleRelease
```

## Project Structure

```
src/
  features/        # Feature screens and components (steps, sleep, water, calories, abc)
  stores/          # Zustand stores for each feature
  hooks/           # App-level hooks (hydration, app state)
  lib/             # Utilities (database, permissions, reminders, dateUtils)
  navigation/      # Root navigator
  components/      # Shared UI components
  constants/       # Colors, spacing, typography
android/
  app/src/main/java/com/trackerapp/personal/
    StepCounterService.kt   # Android foreground service for step counting
    StepServiceModule.kt    # React Native bridge for step service
```

## Permissions Required

- `ACTIVITY_RECOGNITION` — Step counting
- `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH` — Background step tracking
- `POST_NOTIFICATIONS` — Reminders and step count notification
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` — Keep step service running
- `RECEIVE_BOOT_COMPLETED` — Resume tracking after device restart

## Notes

- All data is stored locally using SQLite — no server, no account required
- Step counting works on physical Android devices only (no emulator)
- For treadmill use: keep the phone on your body (pocket/hand) for accurate counting
