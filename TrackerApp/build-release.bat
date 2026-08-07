@echo off
echo ==========================================
echo Building Tracker APK (Release - Unsigned)
echo ==========================================
echo.

REM Navigate to android directory
cd android

echo [1/3] Cleaning previous builds...
call gradlew.bat clean

echo.
echo [2/3] Building release APK...
call gradlew.bat assembleRelease

echo.
echo [3/3] Locating APK file...
if exist "app\build\outputs\apk\release\app-release.apk" (
    echo.
    echo ==========================================
    echo SUCCESS! APK built successfully!
    echo ==========================================
    echo.
    echo APK Location: android\app\build\outputs\apk\release\app-release.apk
    echo APK Size: 
    dir "app\build\outputs\apk\release\app-release.apk" | findstr "app-release.apk"
    echo.
    echo You can install this APK on your Android device.
    echo.
) else (
    echo.
    echo ==========================================
    echo ERROR: APK file not found!
    echo ==========================================
    echo.
    echo Please check the build output above for errors.
    echo.
)

cd ..
pause
