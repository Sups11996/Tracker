# GitHub Release Guide - v1.1.0

## Step 1: Build the Release APK

1. **Navigate to android directory:**
   ```bash
   cd ~/Documents/Tracker/TrackerApp/android
   ```

2. **Clean previous builds:**
   ```bash
   rm -rf app/.cxx .gradle app/build
   ./gradlew clean
   ```

3. **Build release APK:**
   ```bash
   ./gradlew assembleRelease
   ```

4. **Locate the APK:**
   ```
   TrackerApp/android/app/build/outputs/apk/release/app-release.apk
   ```

---

## Step 2: Create GitHub Release

### Method 1: Using GitHub Web Interface (Recommended)

1. **Go to your repository:**
   - Navigate to: https://github.com/Sups11996/Tracker

2. **Click on "Releases":**
   - On the right sidebar, click "Releases"
   - Or go directly to: https://github.com/Sups11996/Tracker/releases

3. **Click "Draft a new release":**
   - Click the green "Draft a new release" button

4. **Fill in release details:**

   **Choose a tag:** `v1.1.0` (should be available in dropdown)
   
   **Release title:** `Tracker v1.1.0 - Custom Logo & Notifications`
   
   **Description:** (Copy and paste this)
   ```markdown
   ## What's New in v1.1.0
   
   ### New Features
   - Custom app logo and adaptive icons
   - Push notification system for daily reminders
   - Extended dashboard data retention (previously limited to 7 days)
   
   ### Improvements
   - NDK 27 compatibility with automatic module patching
   - Comprehensive build instructions for Windows developers
   - Quick start guide for experienced developers
   
   ### Bug Fixes
   - Fixed C++ linking errors in native modules
   - Improved build stability on Windows
   
   ---
   
   ## Installation
   
   1. Download `tracker-v1.1.0.apk` below
   2. Enable "Install from Unknown Sources" in Android settings
   3. Open the APK file and install
   
   ## Build from Source
   
   See [BUILD_INSTRUCTIONS.md](./TrackerApp/BUILD_INSTRUCTIONS.md) for detailed build instructions.
   
   ---
   
   **Full Changelog:** https://github.com/Sups11996/Tracker/compare/v1.0.0...v1.1.0
   ```

5. **Attach APK file:**
   - Drag and drop or click "Attach binaries" at the bottom
   - Upload: `app-release.apk`
   - Rename it to: `tracker-v1.1.0.apk`

6. **Set as latest release:**
   - Check "Set as the latest release"

7. **Publish:**
   - Click "Publish release"

---

### Method 2: Using GitHub CLI (Alternative)

If you have GitHub CLI installed:

```bash
# Navigate to project root
cd ~/Documents/Tracker

# Create the release with the APK
gh release create v1.1.0 \
  TrackerApp/android/app/build/outputs/apk/release/app-release.apk#tracker-v1.1.0.apk \
  --title "Tracker v1.1.0 - Custom Logo & Notifications" \
  --notes-file - <<'EOF'
## What's New in v1.1.0

### New Features
- Custom app logo and adaptive icons
- Push notification system for daily reminders
- Extended dashboard data retention (previously limited to 7 days)

### Improvements
- NDK 27 compatibility with automatic module patching
- Comprehensive build instructions for Windows developers
- Quick start guide for experienced developers

### Bug Fixes
- Fixed C++ linking errors in native modules
- Improved build stability on Windows

---

## Installation

1. Download tracker-v1.1.0.apk below
2. Enable "Install from Unknown Sources" in Android settings
3. Open the APK file and install

## Build from Source

See [BUILD_INSTRUCTIONS.md](./TrackerApp/BUILD_INSTRUCTIONS.md) for detailed build instructions.
EOF
```

---

## Step 3: Verify the Release

1. Go to: https://github.com/Sups11996/Tracker/releases/tag/v1.1.0
2. Verify the APK is attached and downloadable
3. Check that it's marked as "Latest"

---

## Version Information

- **Version Name:** 1.1.0
- **Version Code:** 2
- **Release Date:** Today
- **Previous Version:** v1.0.0

---

## What Changed from v1.0.0

| Feature | v1.0.0 | v1.1.0 |
|---------|--------|--------|
| Custom Logo | ❌ No | ✅ Yes |
| Notifications | ❌ No | ✅ Yes |
| Dashboard Data | 7 days only | Extended retention |
| Build Docs | Basic | Comprehensive |
| NDK 27 Support | Manual patching | Auto-patching |

---

## Next Steps

After publishing:
1. Share the release link with users
2. Update any documentation that references download links
3. Consider announcing on social media or project website

**Release URL:** https://github.com/Sups11996/Tracker/releases/tag/v1.1.0
