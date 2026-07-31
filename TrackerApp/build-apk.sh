#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# build-apk.sh — Local APK build script for TrackerApp
#
# Prerequisites:
#   - Android Studio + Android SDK installed
#   - ANDROID_HOME environment variable set (or android/local.properties exists)
#   - Java 17+ installed
#   - Node.js + npm installed
#
# Usage:
#   bash build-apk.sh
#
# Output:
#   android/app/build/outputs/apk/release/app-release.apk
# ─────────────────────────────────────────────────────────────────────────────

set -e

echo "==> Installing JS dependencies..."
npm install

echo "==> Running prebuild to sync native files..."
npx expo prebuild --platform android --no-install --clean

echo "==> Building release APK..."
cd android
./gradlew assembleRelease
cd ..

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ -f "$APK_PATH" ]; then
  SIZE=$(du -h "$APK_PATH" | cut -f1)
  echo ""
  echo "✓ Build successful!"
  echo "  APK location: $APK_PATH"
  echo "  APK size:     $SIZE"
  echo ""
  echo "Share this file with friends via:"
  echo "  - WhatsApp / Telegram (send file)"
  echo "  - Google Drive / Dropbox"
  echo "  - USB cable (copy directly)"
  echo ""
  echo "Friends must enable 'Install from Unknown Sources' in Android Settings."
else
  echo "✗ Build failed — APK not found at expected path."
  exit 1
fi
