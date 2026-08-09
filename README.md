# Tracker

A personal health tracking app for Android. Track steps, sleep, water intake, calories, and daily habits — all offline with complete privacy.

**Privacy First:** All data stays on your device. No account, no server, no internet required.

---

## Why This App?

- **Complete Privacy** — Your health data never leaves your phone
- **Fast & Lightweight** — No ads, no bloat, instant interactions
- **Rich Visualizations** — Weekly and monthly graphs for comprehensive insights
- **Goal Tracking** — Set and monitor daily goals with real-time progress
- **Battery Efficient** — Background step counting with minimal power consumption
- **Fully Offline** — Works without internet connection

---

## Screenshots

<p align="center">
  <img src="screenshots/home.jpeg" width="200" alt="Home Screen" />
  <img src="screenshots/steps.jpeg" width="200" alt="Steps Dashboard" />
  <img src="screenshots/sleep.jpeg" width="200" alt="Sleep Tracking" />
  <img src="screenshots/water.jpeg" width="200" alt="Water Intake" />
  <img src="screenshots/calorie.jpeg" width="200" alt="Calorie Tracking" />
  <img src="screenshots/settings.jpeg" width="200" alt="Settings" />
</p>

### Demo

<p align="center">
  <img src="screenshots/demo.gif" width="300" alt="App Demo" />
</p>

---

## Features

### Step Tracking
Real-time background step counting using your phone's hardware sensor. Set daily goals, view weekly trends, and monitor monthly progress. Pause tracking manually when in a vehicle or resting.

### Sleep Tracking
Session-based sleep tracking with:
- Sleep latency calculation (time to fall asleep)
- Customizable bedtime and wake-up reminders
- Sleep quality rating
- Weekly and monthly sleep patterns

### Water Intake
Quick logging with customizable drink containers. Add custom amounts for flexibility. Track daily hydration progress with visual indicators.

### Calorie Tracking
- Automatic calorie calculation from walking activity
- Manual workout logging with intensity levels
- Support for gym sessions and custom activities
- Weekly and monthly summaries

### ABC (Activity-Based Counter)
Daily habit limiter for tracking behaviors you want to reduce. Set custom daily limits with summary notifications to help build better habits.

### Data Visualization
- Weekly bar charts for all metrics
- Month-by-week breakdown views
- Month selector with detailed statistics
- Tap any data point to see detailed information

---

## Download

**Latest Release:** [Download APK](../../releases)

### Installation Steps
1. Download the APK from the [Releases](../../releases) page
2. On your Android device, go to **Settings → Apps → Special app access → Install unknown apps**
3. Grant permission to your browser or file manager to install apps
4. Open the downloaded APK file and follow installation prompts

Google Play Store is not required.

---

## How It Works

### Step Counting Technology

The app uses Android's `TYPE_STEP_COUNTER` hardware sensor, a dedicated chip in your phone's IMU (Inertial Measurement Unit) that counts steps at the hardware level. The app reads this sensor value directly without processing raw accelerometer data.

**Accuracy factors:**
- **Device quality** — Flagship phones provide the most accurate counts
- **Phone placement** — Pocket placement works best, followed by hand-held
- **Walking pattern** — Normal walking is detected most reliably

**Data persistence:** The hardware step counter resets on device reboot. The app automatically saves your count to local storage when:
- App goes to background
- Date changes at midnight
- Every 30 seconds while active

### Data Storage

All data is stored in a local SQLite database on your device:
- Daily logs for steps, sleep, water, calories, and habits
- User profile and preferences
- Historical data for weekly and monthly summaries

**Your data is yours** — No cloud synchronization, no external transmission, complete privacy.

---

## Tech Stack

- **React Native + Expo** — Cross-platform framework with native module access
- **TypeScript** — Type-safe development with enhanced IDE support
- **Zustand** — Lightweight state management
- **expo-sqlite** — Local SQLite database
- **expo-notifications** — Reminders and daily summary notifications
- **Custom Native Module** — `StepCounterService.kt` provides reliable background step tracking

---

## Building from Source

### Quick Start

```bash
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp
npm install  # Automatically patches native modules
cd android
./gradlew assembleRelease
```

**APK location:** `android/app/build/outputs/apk/release/app-release.apk`

### Complete Build Guide

**First time building?** See the comprehensive guide: **[BUILD_INSTRUCTIONS.md](TrackerApp/BUILD_INSTRUCTIONS.md)**

It includes:
- Complete prerequisites and installation steps
- Android SDK and NDK setup guide
- Environment variable configuration
- Step-by-step build process
- Troubleshooting common issues
- Technical notes about NDK 27 patches

**Experienced developer?** See quick reference: **[QUICK_START.md](TrackerApp/QUICK_START.md)**

### Key Requirements

- **Node.js** 18+
- **JDK** 17
- **Android Studio** with:
  - Android SDK (API 34+)
  - **NDK 27.1.12297006** (exact version required)
  - CMake 3.22.1
  - Build-Tools 34.0.0+

### Development Build

```bash
npx expo run:android
```

Installs debug APK with hot reloading enabled for development.

---

## Permissions

The app requires these permissions for core functionality:

| Permission | Purpose |
|---|---|
| `ACTIVITY_RECOGNITION` | Access step counter hardware sensor |
| `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_HEALTH` | Enable background step counting |
| `POST_NOTIFICATIONS` | Display persistent step notification and feature reminders |
| `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` | Prevent system from stopping the step service |
| `RECEIVE_BOOT_COMPLETED` | Restart step tracking after device reboot |

All permissions are used exclusively for app functionality. No data collection or external tracking occurs.

---

## Project Structure

```
TrackerApp/
├── src/
│   ├── features/          # Feature modules (steps, sleep, water, calories, ABC)
│   │   ├── home/         # Home screen with feature cards
│   │   ├── dashboard/    # Unified dashboard with tab navigation
│   │   └── settings/     # App settings and data management
│   ├── stores/           # Zustand state management for each feature
│   ├── hooks/            # Custom hooks (useAppHydration for background tasks)
│   ├── lib/              # Database schema, utilities, permissions
│   ├── navigation/       # Tab and stack navigators
│   ├── components/       # Reusable UI components
│   └── constants/        # Design tokens (colors, spacing, typography)
└── android/
    └── app/src/main/java/com/trackerapp/personal/
        ├── StepCounterService.kt    # Foreground service for step counting
        └── StepServiceModule.kt     # React Native bridge module
```

---

## Contributing

Contributions are welcome! You can help by:
- Reporting bugs or issues
- Suggesting new features or improvements
- Submitting pull requests

Please ensure your code follows the existing style and includes appropriate documentation.

---

## License

This project is open source and available under the [MIT License](TrackerApp/LICENSE).

---

**Built for privacy-conscious health tracking**
