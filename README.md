# Tracker - All-in-One Personal Health & Fitness Tracker

A beautiful, privacy-focused Android app that tracks your daily health metrics **completely offline** - no accounts, no servers, no data collection.

## The Problem with Other Apps

Most health tracking apps force you to:
- Create accounts and share personal data
- Pay for basic features via subscriptions
- Deal with ads and tracking
- Use separate apps for each metric (steps, water, sleep, etc.)
- Sync data to cloud servers you don't control
- Accept slow, cluttered interfaces

## What Makes Tracker Different

### 100% Private & Offline
- No account required - your data never leaves your phone
- No internet permission - completely offline
- No tracking, no analytics, no data collection
- All data stored locally in SQLite database

### All-in-One Tracking
Track everything in one beautiful app:
- **Steps** - Background step counting with foreground service
- **Sleep** - Track sleep sessions with quality and latency metrics
- **Water** - Log water intake with custom container shortcuts
- **Calories** - Track workouts and calorie burn
- **ABC Tracking** - Custom activity/behavior/condition logging

### Blazing Fast Performance
- Instant tab switching with smooth skeleton loading
- Custom-built tab bar for zero-lag UI responses
- Optimized rendering with glass morphism design
- Near-instant screen transitions (100ms)

### Beautiful Dark Theme
- Modern glass morphism UI design
- Smooth animations and transitions
- Clean, minimalist interface
- No clutter, no ads, no distractions

### Smart Features
- **Background step tracking** - Counts steps even when app is closed
- **Custom water containers** - Add your bottle/cup sizes for quick logging
- **Sleep reminders** - Optional bedtime and wake-up notifications
- **ABC system** - Track personal habits/activities with customizable logging
- **Data export** - Your data, your control

## Installation

### Download APK (Easiest)
1. [**Download Latest APK**](https://github.com/Sups11996/Tracker/releases/latest/download/tracker.apk) — click to download directly
2. Enable "Install from Unknown Sources" in your Android settings
3. Install the APK
4. Done!

### Build from Source
**Prerequisites:**
- [Node.js](https://nodejs.org/) (v18 or higher)
- [Android Studio](https://developer.android.com/studio) with Android SDK
- Java 17+

**Steps:**
```bash
# 1. Clone the repository
git clone https://github.com/Sups11996/Tracker.git
cd Tracker/TrackerApp

# 2. Install dependencies
npm install

# 3. Run prebuild to generate native files
npx expo prebuild --platform android

# 4. Build the APK
cd android
./gradlew assembleRelease

# 5. Find your APK at:
# android/app/build/outputs/apk/release/app-release.apk
```

**Transfer to Phone:**
- USB cable: Copy APK directly to phone
- Cloud: Upload to Google Drive/Dropbox and download on phone
- Messaging: Send via WhatsApp/Telegram to yourself

## Features

### Step Tracking
- Real-time step counting with foreground service
- Daily, weekly, monthly statistics with charts
- Distance and calorie calculation based on profile
- Background tracking continues even when app is closed

### Sleep Tracking
- Start/end sleep sessions with one tap
- Track sleep quality (1-5 stars)
- Log sleep latency (time to fall asleep)
- Sleep reminders with customizable times
- Weekly sleep statistics and insights

### Water Tracking
- Quick-add water intake with one tap
- Custom containers (add your bottle/cup sizes)
- Daily goal tracking with progress visualization
- Undo/redo last log entries
- Hydration history and statistics

### Calorie Tracking
- Log workouts with duration and intensity
- Automatic calorie burn calculation
- Exercise history with date/time
- Weekly calorie burn charts
- Workout deletion and management

### ABC Tracking (Advanced)
- Track custom activities/behaviors/conditions
- Optional feature (can be disabled)
- One-tap logging system
- Daily tracking with timestamps
- Weekly pattern visualization

## Tech Stack

- **Framework:** React Native + Expo
- **Database:** SQLite (expo-sqlite)
- **Navigation:** React Navigation
- **State:** Zustand
- **UI:** Custom glass morphism design
- **Native:** Android foreground service for step tracking
- **Language:** TypeScript

## Data & Privacy

- **100% Local Storage** - All data stored in device SQLite database
- **No Internet Required** - App works completely offline
- **No Tracking** - Zero analytics, zero data collection
- **Your Data** - Export/import functionality for full control
- **Open Source** - Code is public, verify for yourself

## Permissions Required

- **Activity Recognition** - Count steps in background
- **Foreground Service** - Keep step counter running
- **Notifications** - Display step count in notification
- **Battery Optimization** - Optional, for consistent step tracking

## Roadmap

- [ ] Data export (CSV/JSON)
- [ ] Data import/restore
- [ ] Backup to local storage
- [ ] More chart types and visualizations
- [ ] Weekly/monthly goal setting
- [ ] Custom themes
- [ ] iOS support

## Contributing

Contributions are welcome! Feel free to:
- Report bugs via [Issues](https://github.com/Sups11996/Tracker/issues)
- Suggest features
- Submit pull requests
- Improve documentation

## License

This project is open source and available under the [MIT License](LICENSE).

## Why I Built This

Tired of subscription-based health apps that track you more than your health? I wanted:
- A simple, all-in-one tracker
- Complete privacy and offline functionality
- No accounts, no data sharing, no nonsense
- Beautiful, fast, modern UI

So I built it. Now it's yours to use, free forever.

## Support

Found a bug? Have a feature request?
- Open an [Issue](https://github.com/Sups11996/Tracker/issues)
- Star the repo if you find it useful!

---

**Made with care for privacy-conscious health enthusiasts**
