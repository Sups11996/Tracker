package com.trackerapp.personal

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * Native module for handling Android-specific permissions that cannot be requested via JavaScript.
 */
class PermissionsModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "PermissionsModule"

    /**
     * Check if the app is currently ignoring battery optimizations.
     * Returns true if exempted, false otherwise.
     */
    @ReactMethod
    fun isBatteryOptimizationIgnored(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val pm = reactApplicationContext.getSystemService(Context.POWER_SERVICE) as PowerManager
                val packageName = reactApplicationContext.packageName
                val isIgnoring = pm.isIgnoringBatteryOptimizations(packageName)
                promise.resolve(isIgnoring)
            } else {
                // Battery optimization doesn't exist before Android 6.0
                promise.resolve(true)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", "Failed to check battery optimization status", e)
        }
    }

    /**
     * Request to ignore battery optimizations for this app.
     * Opens the system dialog where user can grant the exemption.
     */
    @ReactMethod
    fun requestIgnoreBatteryOptimizations() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                    data = Uri.parse("package:${reactApplicationContext.packageName}")
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or 
                            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                            Intent.FLAG_ACTIVITY_NO_HISTORY
                }
                reactApplicationContext.startActivity(intent)
            }
        } catch (e: Exception) {
            // Fallback: open battery optimization settings page
            try {
                val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                            Intent.FLAG_ACTIVITY_NO_HISTORY
                }
                reactApplicationContext.startActivity(intent)
            } catch (e2: Exception) {
                // Last resort: open general app settings
                openAppSettings()
            }
        }
    }

    /**
     * Opens the Usage Access settings screen.
     * This allows users to grant PACKAGE_USAGE_STATS permission.
     */
    @ReactMethod
    fun openUsageAccessSettings() {
        try {
            val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                        Intent.FLAG_ACTIVITY_NO_HISTORY
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            // Fallback to general settings
            openAppSettings()
        }
    }

    /**
     * Opens this app's page in Android system settings.
     */
    @ReactMethod
    fun openAppSettings() {
        try {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.fromParts("package", reactApplicationContext.packageName, null)
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                        Intent.FLAG_ACTIVITY_NO_HISTORY
            }
            reactApplicationContext.startActivity(intent)
        } catch (e: Exception) {
            // Last resort: open general settings
            try {
                val intent = Intent(Settings.ACTION_SETTINGS).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS or
                            Intent.FLAG_ACTIVITY_NO_HISTORY
                }
                reactApplicationContext.startActivity(intent)
            } catch (e2: Exception) {
                // Nothing more we can do
            }
        }
    }
}
