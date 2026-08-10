# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2025-01-26

### Added
- Slide-up animations on all dashboard pages (Steps, Sleep, Water, Calories, ABC)
- Swipe gestures to switch between dashboard tabs (swipe left/right)
- Staggered card animations on Settings screen

### Fixed
- Flash issue when loading dashboard data - now waits for actual data before showing content
- Step counter jump issue on first reading after sensor reset
- Improved step tracking accuracy after device reboot
- Skeleton loader timing issues causing component flash

### Changed
- Improved animation timing for smoother transitions (200ms skeleton + 600ms slide-up)
- Settings screen now shows staggered entrance animation like Home screen
- Optimized data loading flow to prevent UI flashing
- Enhanced transition smoothness between dashboard tabs

### Technical
- Refactored dashboard loading state management
- Cleaned up unused imports and code
- Improved animation architecture for better performance

## [1.1.0] - 2025-01-24

### Added
- Weekly bar charts for all metrics
- Monthly statistics with week-by-week breakdown
- Comprehensive build documentation (BUILD_INSTRUCTIONS.md, QUICK_START.md)
- Automatic native module patching for Android NDK 27 compatibility
- Postinstall script to fix C++ linking issues

### Fixed
- Step counter persistence after device reboot
- Sensor baseline reset detection and handling
- Permission dialog staying in recents

### Technical
- Updated to Android NDK 27.1.12297006
- Added c++_shared linking patches for native modules
- Improved step tracking service reliability

## [1.0.0] - 2025-01-21

### Added
- Initial public release
- Step tracking with background service and foreground notification
- Sleep tracking with session-based logging and quality rating
- Water intake tracking with customizable containers
- Calorie tracking (automatic from walking + manual workouts)
- ABC (Activity-Based Counter) for daily habit tracking
- Dashboard with tab navigation for all features
- Home screen with quick overview cards
- Settings screen with profile management and data controls
- Dark mode glassmorphism UI design
- Local SQLite database for complete offline functionality
- Privacy-first approach - no internet, no accounts, no data collection

### Technical
- React Native + Expo framework
- TypeScript for type safety
- Zustand for state management
- expo-sqlite for local database
- Native Kotlin services for background step tracking
- Automatic service restart after device reboot

