# Tracker

A personal health tracking app for Android. All data stays on your device — no account, no server, no internet required.

> **Note on step accuracy:** Step counts depend entirely on your phone's hardware step counter sensor (`TYPE_STEP_COUNTER`). Flagship phones (Samsung Galaxy S series, Pixel) are very accurate. Budget phones may vary. The app reads directly from the sensor chip — it does not estimate steps in software.

<br/>

## Features

| Feature | Details |
|---|---|
| **Steps** | Real-time background step counting, daily goal, tap any bar to inspect that day |
| **Sleep** | Session-based sleep tracking, bedtime & wake reminders, quality rating |
| **Water** | Quick-log containers + custom ml input, daily goal progress |
| **Calories** | Walking calories from steps + manual workout logging |
| **ABC** | Custom daily habit counter with configurable goal and daily summary notification |
| **Dashboards** | Weekly bar charts, month-by-week breakdown, month selector with stats for all features |

<br/>

## Download

Grab the latest APK from the [Releases](../../releases) page. On your Android device go to **Settings → Apps → Special app access → Install unknown apps** and allow your browser or file manager. Then open the APK and install.

No Play Store needed.

<br/>

## How Steps Work

The app uses Android's built-in `TYPE_STEP_COUNTER` hardware sensor — a dedicated chip in the phone's IMU that counts steps at the hardware level using its own algorithm. Your app only reads the value; it does not process raw accelerometer data.

**Accuracy depends on:**
- Phone hardware quality (flagship > mid-range > budget)
- Where the phone is carried (pocket > hand > bag)
- Walking style — shuffle walking may not register well

**Treadmill:** Works fine as long as the phone is on your body (pocket or hand), not sitting on the console.

**Important:** `TYPE_STEP_COUNTER` resets on reboot. The app saves your count to the local database automatically when the app goes to background, on date change, and every 5 minutes.

<br/>

## Tech Stack

- **React Native** + **Expo** (bare workflow)
- **TypeScript**
- **Zustand** — state management
- **expo-sqlite** — local SQLite database
- **expo-notifications** — reminders
- **Custom Android native module** — `StepCounterService.kt` foreground service for background step counting

<br/>

## Building Locally

### Prerequisites

- Node.js 18+
- Android Studio + Android SDK
- Java 17
- Physical Android device (step sensor is not available on emulators)

### Setup

```bash
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp
npm install
```

### Debug build (development)

```bash
npx expo run:android
```

### Release APK (unsigned, for local testing)

```bash
cd android
./gradlew assembleRelease
```

Output: `TrackerApp/android/app/build/outputs/apk/release/app-release.apk`

Install directly:
```bash
adb install app/build/outputs/apk/release/app-release.apk
```

<br/>

## Permissions

| Permission | Purpose |
|---|---|
| `ACTIVITY_RECOGNITION` | Read step counter sensor |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH` | Run step counting in background |
| `POST_NOTIFICATIONS` | Step count notification + feature reminders |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Prevent OS from killing the step service |
| `RECEIVE_BOOT_COMPLETED` | Resume step tracking after device reboot |

<br/>

## Project Structure

```
TrackerApp/
  src/
    features/       # Steps, Sleep, Water, Calories, ABC — screens + home cards
    stores/         # Zustand stores for each feature
    hooks/          # useAppHydration — handles background save, date change, hydration
    lib/            # SQLite schema, date utils, permissions, reminders, seed data
    navigation/     # Root navigator + tab navigator
    components/     # Shared UI (Card, StatCard, BarChart, CustomAlert)
    constants/      # Colors, spacing, typography, radius
  android/
    app/src/main/java/com/trackerapp/personal/
      StepCounterService.kt   # Android foreground service — reads TYPE_STEP_COUNTER
      StepServiceModule.kt    # React Native bridge to control the service
```
