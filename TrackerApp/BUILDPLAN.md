# TrackerApp — Build Plan

Delete this file when the project is complete.

---

## Rules
- Complete chunks in order
- Mark done with [x] immediately after finishing
- Each chunk must build and run before moving to the next

---

## CHUNK 1 — Project Foundation [x] DONE
Clean slate setup. Everything the rest of the app depends on.

- [x] 1.1 Upgrade Expo SDK 54 → 57, update all dependencies to SDK 57 compatible versions
- [x] 1.2 Remove @supabase/supabase-js and expo-secure-store from package.json
- [x] 1.3 Install required packages: expo-sqlite, expo-sensors, expo-notifications, expo-blur, expo-task-manager, expo-background-task, expo-font, @expo-google-fonts/inter
- [x] 1.4 Rewrite app.json — dark theme, Android permissions (ACTIVITY_RECOGNITION, POST_NOTIFICATIONS, RECEIVE_BOOT_COMPLETED, FOREGROUND_SERVICE, REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, PACKAGE_USAGE_STATS)
- [x] 1.5 Rewrite src/constants/index.ts — full design system (COLORS, TYPOGRAPHY, SPACING, RADIUS, feature accent colors)
- [x] 1.6 Rewrite src/types/index.ts + navigation.ts + user.ts — local-only types, no Supabase
- [x] 1.7 Rewrite src/lib/index.ts — SQLite database init, schema creation (all tables), migration helper
- [x] 1.8 Rewrite src/stores/index.ts — userProfileStore (Zustand, persisted to SQLite)
- [x] 1.9 Rewrite App.tsx — remove Supabase/auth, add SQLiteProvider, fonts, gesture handler
- [x] 1.10 Rewrite src/navigation/RootNavigator.tsx — onboarding-done check instead of auth check
- [x] 1.11 Verify app boots without errors on Android — bundle compiled 3028 modules, 0 errors

---

## CHUNK 2 — Design System & UI Primitives [ ]
Reusable components used across all features.

- [ ] 2.1 Rewrite src/components/ui/Card.tsx — glassmorphism card with expo-blur
- [ ] 2.2 Rewrite src/components/ui/Button.tsx — primary/secondary/ghost variants, spring press animation
- [ ] 2.3 Rewrite src/components/ui/TextInput.tsx — dark themed, glassy border
- [ ] 2.4 Create src/components/ui/ProgressRing.tsx — animated circular progress (reanimated)
- [ ] 2.5 Create src/components/ui/Toast.tsx — slide-up undo toast with timer
- [ ] 2.6 Create src/components/ui/ScreenWrapper.tsx — safe area + background color wrapper
- [ ] 2.7 Create src/components/ui/StatCard.tsx — small stat display card for dashboard
- [ ] 2.8 Rewrite src/components/ui/index.ts — export all
- [ ] 2.9 Rewrite src/navigation/MainTabs.tsx — glassy tab bar, correct icons per feature
- [ ] 2.10 Create placeholder screens for Home, Dashboard, Settings (just shows title, no crash)

---

## CHUNK 3 — Onboarding Flow [ ]
First-time setup. Collects all user data needed by every feature.

- [ ] 3.1 Create OnboardingNavigator (stack inside auth flow)
- [ ] 3.2 Screen 1 — Welcome + Username input
- [ ] 3.3 Screen 2 — Gender + Age
- [ ] 3.4 Screen 3 — Height + Weight
- [ ] 3.5 Screen 4 — Auto-calculate water goal, show result, allow edit
- [ ] 3.6 Screen 5 — "Do you go to the gym?" Yes/No
- [ ] 3.7 Screen 6 — "Do you use ABC?" Yes/No
- [ ] 3.8 Screen 7 — Permissions setup (Activity Recognition, Notifications, Battery Optimization) with explanations
- [ ] 3.9 Screen 8 — Water containers setup (create first containers)
- [ ] 3.10 Save all onboarding data to SQLite user_profile table
- [ ] 3.11 Mark onboarding complete, navigate to main app
- [ ] 3.12 Verify full onboarding flow works end to end

---

## CHUNK 4 — Step Tracking [ ]
Native Android foreground service + home card + dashboard.

- [ ] 4.1 Create SQLite tables: daily_steps, step_tracking_state
- [ ] 4.2 Write native Android BootReceiver (Kotlin) — restarts service on boot
- [ ] 4.3 Write native Android StepForegroundService (Kotlin) — TYPE_STEP_COUNTER sensor, persistent notification, SQLite writes
- [ ] 4.4 Create config plugin to register service + receiver in AndroidManifest
- [ ] 4.5 Create src/stores/stepStore.ts — Zustand, hydrates from SQLite, subscribes to native events
- [ ] 4.6 Create src/features/steps/StepHomeCard.tsx — steps, goal, progress ring, distance, calories, status, quick action
- [ ] 4.7 Wire StepHomeCard into HomeScreen
- [ ] 4.8 Create DailyResetReceiver (Kotlin) — midnight alarm, archives + resets
- [ ] 4.9 Create src/features/steps/StepDashboard.tsx — 7-day graph, monthly graph, stats, streaks
- [ ] 4.10 Wire StepDashboard into Dashboard tab
- [ ] 4.11 Settings section — goal edit, tracking toggle, vehicle mode default
- [ ] 4.12 Test: background counting, reboot recovery, vehicle mode, pause/resume

---

## CHUNK 5 — Sleep Tracking [ ]
Manual start/end with background persistence.

- [ ] 5.1 Create SQLite table: sleep_sessions
- [ ] 5.2 Create src/stores/sleepStore.ts — active session state, history
- [ ] 5.3 Create sleep foreground notification — start time, elapsed, End Sleep action
- [ ] 5.4 Create BootReceiver entry for sleep (restore notification if session was active)
- [ ] 5.5 Create src/features/sleep/SleepHomeCard.tsx — status, last night duration, start/end button
- [ ] 5.6 Wire SleepHomeCard into HomeScreen
- [ ] 5.7 Create sleep latency prompt screen — chips + custom input
- [ ] 5.8 Calculate and save final sleep record (session duration, latency, actual sleep)
- [ ] 5.9 Create src/features/sleep/SleepDashboard.tsx — graphs, trends, stats
- [ ] 5.10 Wire SleepDashboard into Dashboard tab
- [ ] 5.11 Settings section — goal, reminders
- [ ] 5.12 Test: overnight tracking, reboot mid-sleep, forgotten session, midnight crossover

---

## CHUNK 6 — Water Intake Tracking [ ]
One-tap logging, containers, undo.

- [ ] 6.1 Create SQLite tables: water_containers, water_logs, water_daily_summary
- [ ] 6.2 Create src/stores/waterStore.ts — containers, today's logs, undo queue
- [ ] 6.3 Create src/features/water/WaterHomeCard.tsx — intake, goal, progress, container quick-add buttons
- [ ] 6.4 Implement one-tap log — instant add, animated progress update
- [ ] 6.5 Implement undo toast — 5 second window, removes last entry
- [ ] 6.6 Wire WaterHomeCard into HomeScreen
- [ ] 6.7 Create src/features/water/WaterDashboard.tsx — graphs, streak, stats, daily timeline
- [ ] 6.8 Wire WaterDashboard into Dashboard tab
- [ ] 6.9 Container management screens (add/edit/delete/reorder) in Settings
- [ ] 6.10 Reminders — inactivity nudge, X ml left, goal achieved
- [ ] 6.11 Midnight reset logic
- [ ] 6.12 Test: rapid taps, undo, deleted container history, midnight reset

---

## CHUNK 7 — Calories Burned Tracking [ ]
Auto walking calories + manual workout logging.

- [ ] 7.1 Create SQLite tables: workout_logs, calories_daily_summary
- [ ] 7.2 Create src/stores/caloriesStore.ts — walking calories (derived from step data), workout logs
- [ ] 7.3 Create src/features/calories/CaloriesHomeCard.tsx — total, walking, workout breakdown, Log Workout button
- [ ] 7.4 Implement walking calorie calculation (from stepStore data, weight, height)
- [ ] 7.5 Create workout logging flow — duration chips, intensity picker, note field, save
- [ ] 7.6 Wire CaloriesHomeCard into HomeScreen
- [ ] 7.7 Create src/features/calories/CaloriesDashboard.tsx — graphs, workout history, stats
- [ ] 7.8 Wire CaloriesDashboard into Dashboard tab
- [ ] 7.9 Evening workout reminder notification
- [ ] 7.10 Settings section — gym tracking toggle, reminder time
- [ ] 7.11 Edit/delete workout logs
- [ ] 7.12 Test: gym toggle on/off, multiple workouts, midnight reset

---

## CHUNK 8 — Screen Time Tracking [ ]
OS Usage Stats API, fully automatic.

- [ ] 8.1 Create SQLite tables: app_usage_sessions, screen_time_daily_summary, app_daily_stats
- [ ] 8.2 Write native Android UsageStatsService (Kotlin) — reads UsageStatsManager, screen on/off, unlock count
- [ ] 8.3 Create Usage Access permission flow — deep-link to system settings, explanation screen
- [ ] 8.4 Create src/stores/screenTimeStore.ts — today's data, per-app breakdown
- [ ] 8.5 Create src/features/screentime/ScreenTimeHomeCard.tsx — total time, most-used app, unlocks
- [ ] 8.6 Wire ScreenTimeHomeCard into HomeScreen
- [ ] 8.7 Create src/features/screentime/ScreenTimeDashboard.tsx — graphs, app breakdown, timeline
- [ ] 8.8 Create per-app detail screen
- [ ] 8.9 Wire ScreenTimeDashboard + app detail into Dashboard tab
- [ ] 8.10 Awareness notifications (configurable)
- [ ] 8.11 Settings section — toggle, notification prefs
- [ ] 8.12 Test: permission revoke, app uninstall, midnight reset, reboot

---

## CHUNK 9 — ABC Counter [ ]
Private single-tap counter.

- [ ] 9.1 Create SQLite tables: abc_logs, abc_daily_summary
- [ ] 9.2 Create src/stores/abcStore.ts — today's count, entries, undo queue
- [ ] 9.3 Create src/features/abc/AbcHomeCard.tsx — count, last logged, trend vs yesterday, add button
- [ ] 9.4 Implement one-tap log — instant increment, undo toast
- [ ] 9.5 Wire AbcHomeCard into HomeScreen (only if enabled)
- [ ] 9.6 Create src/features/abc/AbcDashboard.tsx — graphs, time-of-day breakdown, stats, daily timeline
- [ ] 9.7 Wire AbcDashboard into Dashboard tab (only if enabled)
- [ ] 9.8 Midnight reset logic
- [ ] 9.9 Settings section — enable/disable toggle, notification prefs
- [ ] 9.10 Test: rapid taps, undo, disable/re-enable (data persists), midnight reset

---

## CHUNK 10 — Home Screen Assembly [ ]
All cards together, ordered and polished.

- [ ] 10.1 Greeting header (username, date, time of day message)
- [ ] 10.2 Card ordering and spacing — all 6 feature cards in correct order
- [ ] 10.3 Card tap → navigate to respective dashboard section
- [ ] 10.4 Pull-to-refresh to sync all store data
- [ ] 10.5 Hide disabled feature cards (ABC if disabled, Gym card if gym=No)
- [ ] 10.6 Animate cards on screen mount (fade + translate up, staggered)

---

## CHUNK 11 — Dashboard Screen Assembly [ ]
All dashboards together with navigation.

- [ ] 11.1 Dashboard tab — feature selector tabs (Steps / Sleep / Water / Calories / Screen / ABC)
- [ ] 11.2 Wire all 6 feature dashboards under their respective tabs
- [ ] 11.3 Consistent chart styling across all dashboards (same bar/line chart component)
- [ ] 11.4 Hide disabled feature tabs

---

## CHUNK 12 — Settings Screen [ ]
All settings consolidated.

- [ ] 12.1 Profile section — view/edit username, gender, age, height, weight
- [ ] 12.2 Steps settings — goal, tracking toggle, vehicle mode default
- [ ] 12.3 Sleep settings — goal, bedtime/wake reminders
- [ ] 12.4 Water settings — goal, container management, reminder prefs
- [ ] 12.5 Calories settings — gym toggle, workout reminder time
- [ ] 12.6 Screen Time settings — tracking toggle, notification prefs
- [ ] 12.7 ABC settings — enable/disable, notification prefs
- [ ] 12.8 Permissions status section — shows current status of each permission, deep-link to fix
- [ ] 12.9 Data section — clear history per feature (with confirmation)

---

## CHUNK 13 — Polish & Edge Cases [ ]
Final pass before APK build.

- [ ] 13.1 Midnight reset — test all 6 features reset correctly at 00:00
- [ ] 13.2 Timezone change handling — verify date-based records use local date not UTC
- [ ] 13.3 Phone restart recovery — all active sessions and services restore
- [ ] 13.4 Battery optimization — verify app is whitelisted, services survive background kill
- [ ] 13.5 Empty states — every card and dashboard shows sensible empty state on first use
- [ ] 13.6 Loading states — skeleton loaders while SQLite hydrates
- [ ] 13.7 Error boundaries — no white screen crashes
- [ ] 13.8 StatusBar dark style on all screens
- [ ] 13.9 Android back button handling

---

## CHUNK 14 — APK Build [ ]
Final build and distribution.

- [ ] 14.1 Install and configure EAS CLI
- [ ] 14.2 Configure eas.json for local APK build (preview profile)
- [ ] 14.3 Run eas build --platform android --profile preview
- [ ] 14.4 Test APK on physical device
- [ ] 14.5 Share APK file to friends

---

## Progress Summary
- Chunks complete: 1 / 14
- Current chunk: 2 — Design System & UI Primitives
