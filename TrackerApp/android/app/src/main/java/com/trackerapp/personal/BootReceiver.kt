package com.trackerapp.personal

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Boot receiver that automatically restarts the step counter service when the device boots up.
 * This ensures step tracking continues seamlessly after a reboot.
 */
class BootReceiver : BroadcastReceiver() {
    
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Check database to see if user had step tracking enabled
            var shouldRestart = false
            try {
                val appFilesDir = context.filesDir
                val possiblePaths = mutableListOf<java.io.File>()
                
                // Standard Android path
                possiblePaths.add(context.getDatabasePath("tracker.db"))
                
                // Expo SQLite path
                val sqliteDir = java.io.File(appFilesDir, "SQLite")
                if (sqliteDir.exists()) {
                    possiblePaths.add(java.io.File(sqliteDir, "tracker.db"))
                }
                
                // Check all subdirectories in files
                appFilesDir?.listFiles()?.forEach { dir ->
                    if (dir.isDirectory) {
                        val trackerDb = java.io.File(dir, "tracker.db")
                        if (trackerDb.exists()) {
                            possiblePaths.add(trackerDb)
                        }
                    }
                }
                
                var dbPath: java.io.File? = null
                for (path in possiblePaths) {
                    if (path.exists()) {
                        dbPath = path
                        break
                    }
                }
                
                if (dbPath != null && dbPath.exists()) {
                    val db = android.database.sqlite.SQLiteDatabase.openDatabase(
                        dbPath.path, null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY
                    )
                    
                    val cursor = db.rawQuery(
                        "SELECT is_tracking FROM step_tracking_state WHERE id = 1", null
                    )
                    
                    if (cursor.moveToFirst()) {
                        shouldRestart = cursor.getInt(0) == 1
                    } else {
                        shouldRestart = true
                    }
                    
                    cursor.close()
                    db.close()
                } else {
                    shouldRestart = true
                }
            } catch (e: Exception) {
                // If we can't check the database, restart the service anyway
                shouldRestart = true
            }
            
            if (shouldRestart) {
                try {
                    val serviceIntent = StepCounterService.getIntent(context)
                    
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        context.startForegroundService(serviceIntent)
                    } else {
                        context.startService(serviceIntent)
                    }
                } catch (e: Exception) {
                    // Service start failed
                }
            }
        }
    }
}
