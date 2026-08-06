# Tracker

A personal health tracking app for Android. Tracks steps, sleep, water intake, and calories — all stored locally on your device. No account required, no data leaves your phone.

<br/>

## Features

| Feature | Details |
|---|---|
| 👣 **Steps** | Real-time step counting via background service, daily goal, weekly & monthly graphs |
| 😴 **Sleep** | Session-based sleep tracking, bedtime & wake reminders, goal tracking |
| 💧 **Water** | Glass-based logging with custom containers, daily goal progress |
| 🔥 **Calories** | Walking calories from steps + manual workout logging |
| 📊 **Dashboards** | Weekly bar charts, monthly breakdown by week, month selector with stats |

<br/>

## Screenshots

> Coming soon

<br/>

## Download

Grab the latest APK from the [Releases](../../releases) page. Enable **Install unknown apps** on your Android device and install directly — no Play Store needed.

<br/>

## Tech Stack

- **React Native** + **Expo** (bare workflow)
- **TypeScript**
- **Zustand** — state management
- **expo-sqlite** — local database
- **expo-notifications** — reminders
- **Custom Android native module** — background step counting via `StepCounterService.kt`

<br/>

## Building Locally

### Prerequisites

- Node.js 18+
- Android Studio + Android SDK
- Java 17
- Physical Android device (step counter requires real hardware sensor)

### Setup

```bash
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp
npm install
```

### Debug build

```bash
npx expo run:android
```

### Release APK

```bash
cd android
./gradlew assembleRelease
```

Output: `android/app/build/outputs/apk/release/app-release.apk`

```bash
adb install app/build/outputs/apk/release/app-release.apk
```

<br/>

## Permissions

| Permission | Purpose |
|---|---|
| `ACTIVITY_RECOGNITION` | Step counting |
| `FOREGROUND_SERVICE` | Background step tracking |
| `POST_NOTIFICATIONS` | Step count notification + reminders |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Keep step service alive |
| `RECEIVE_BOOT_COMPLETED` | Resume tracking after reboot |

<br/>

## Notes

- All data is stored locally using SQLite — no server, no account, no internet required
- Step counting works on physical Android devices only (not emulator)
- Works on treadmills — keep the phone on your body for accurate counting
