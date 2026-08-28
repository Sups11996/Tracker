package com.trackerapp.personal

import android.app.*
import android.content.Context
import android.content.Intent
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class StepCounterService : Service(), SensorEventListener {

    companion object {
        const val CHANNEL_ID = "step_tracking_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_PAUSE = "pause"
        const val ACTION_RESUME = "resume"
        const val ACTION_RESET = "reset"
        const val ACTION_SYNC = "sync"  // Immediately emit current step count to JS
        const val PREF_NAME = "step_prefs"
        const val PREF_STEPS = "steps"
        const val PREF_DATE = "date"
        const val PREF_SENSOR_BASE = "sensor_base"
        const val PREF_PRE_REBOOT_STEPS = "pre_reboot_steps"
        const val PREF_LATEST_SENSOR_VALUE = "latest_sensor_value"
        // Average step length: 0.762m, calories per step: 0.04 kcal
        const val STEP_LENGTH_M = 0.762f
        const val CAL_PER_STEP = 0.04f

        fun getIntent(context: Context): Intent = Intent(context, StepCounterService::class.java)
    }

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    private var wakeLock: PowerManager.WakeLock? = null
    private var sensorManagerInitialized = false  // Track if lateinit sensorManager is safe to use

    private var todaySteps = 0
    private var sensorBase = -1L   // raw sensor value at service start or reset
    private var preRebootSteps = 0  // steps before sensor reset (preserved across reboot)
    private var sensorResetDetected = false  // flag to skip first reading after reset
    @Volatile private var latestSensorValue = -1L  // tracks sensor value even when paused (written by sensor thread, read by command thread)
    private var lastUpdateTime = 0L  // timestamp of last step update (for rate limiting)
    private var currentDate = ""
    @Volatile private var isPaused = false  // Volatile for thread-safe reads
    @Volatile private var isDestroyed = false  // Track if service is being destroyed

    private val prefs get() = try {
        getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    } catch (e: Exception) {
        // SharedPreferences unavailable - storage failure
        null
    }

    override fun onCreate() {
        super.onCreate()
        val sensorService = getSystemService(Context.SENSOR_SERVICE)
        if (sensorService == null) {
            // SensorManager not available - device issue
            stopSelf()
            return
        }
        sensorManager = sensorService as SensorManager
        sensorManagerInitialized = true  // Mark as safe to use
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        
        // Check if step sensor is available
        if (stepSensor == null) {
            // Device doesn't have step counter sensor
            // Stop service gracefully and don't proceed
            stopSelf()
            return
        }
        
        createNotificationChannel()
        acquireWakeLock()
        loadPersistedState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // Safety check: if sensor unavailable, service should not have started
        // This handles race condition where onCreate called stopSelf() but onStartCommand still fires
        if (stepSensor == null) {
            stopSelf()
            return START_NOT_STICKY
        }
        
        val action = intent?.action
        when (action) {
            ACTION_PAUSE  -> { 
                synchronized(this) {
                    isPaused = true
                }
                updateDatabasePauseState(true)
                emitStatus("paused")
                updateNotification()
            }
            ACTION_RESUME -> { 
                synchronized(this) {
                    isPaused = false
                    
                    // Reset baseline to latest sensor value to discard steps accumulated during pause
                    if (latestSensorValue >= 0) {
                        preRebootSteps = todaySteps  // Save current steps before resetting baseline
                        sensorBase = latestSensorValue
                    }
                }
                
                updateDatabasePauseState(false)
                emitStatus("tracking")
                updateNotification()
            }
            ACTION_RESET  -> resetSteps()
            ACTION_SYNC   -> emitSteps()  // Immediately push current count to JS
            else -> {
                // Default start: begin foreground service and register sensor
                try {
                    startForeground(NOTIFICATION_ID, buildNotification())
                } catch (e: Exception) {
                    // startForeground can fail due to permission issues or system state
                    // Stop service gracefully if we can't start foreground
                    stopSelf()
                    return START_NOT_STICKY
                }
                registerSensor()
                loadPauseStateFromDatabase()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        isDestroyed = true
        
        // Only access sensorManager if it was successfully initialized
        if (sensorManagerInitialized) {
            try {
                sensorManager.unregisterListener(this)
            } catch (e: Exception) {
                // Ignore unregister errors
            }
        }
        
        try {
            wakeLock?.release()
        } catch (e: Exception) {
            // Ignore release errors
        }
        
        emitStatus("paused")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Sensor ────────────────────────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent?) {
        // Quick exit if service is being destroyed
        if (isDestroyed) return
        
        event ?: return
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return

        // Validate sensor data array
        if (event.values.isEmpty()) {
            // Malformed sensor event - ignore
            return
        }

        val rawValue = event.values[0].toLong()
        
        // Sanity check: sensor should never return negative values or special float values
        // NaN.toLong() = 0, Infinity.toLong() = Long.MAX_VALUE
        if (rawValue < 0 || rawValue == Long.MAX_VALUE) {
            // Sensor malfunction or special value - ignore this reading
            return
        }
        
        // Always track the latest sensor value, even when paused (outside sync for performance)
        latestSensorValue = rawValue
        
        // Check if date changed (do this even when paused to reset at midnight)
        // Use local timezone to match the JS side (getTodayLocal)
        val today = try {
            LocalDate.now(java.time.ZoneId.systemDefault()).format(DateTimeFormatter.ISO_LOCAL_DATE)
        } catch (e: Exception) {
            // Clock error or DateTimeException - keep current date
            currentDate
        }
        if (today != currentDate) {
            var previousDate = ""
            var previousSteps = 0
            synchronized(this) {
                // Double-check inside sync block
                if (today != currentDate) {
                    previousDate = currentDate
                    previousSteps = todaySteps
                    currentDate = today
                    sensorBase = rawValue
                    todaySteps = 0
                    preRebootSteps = 0
                    sensorResetDetected = false
                    lastUpdateTime = 0  // Reset rate limiting timer for new day
                    latestSensorValue = rawValue  // Reset to current value for new day
                    saveState()
                }
            }
            if (previousDate.isNotEmpty() && previousSteps > 0) {
                saveDailyStepsToDatabase(previousDate, previousSteps)
            }
            emitSteps()  // Emit zero steps for new day
            updateNotification()
            // Don't return - continue to handle pause state
        }
        
        // If paused, don't process steps but keep tracking sensor
        if (isPaused) return

        synchronized(this) {
            if (sensorResetDetected) {
                // First reading after reset - use this as new baseline
                // BUT FIRST: Add any steps taken between reset detection and this reading
                // Check for overflow before converting to Int
                if (rawValue > Int.MAX_VALUE) {
                    // Sensor value too large - treat as glitch
                    sensorBase = rawValue
                    sensorResetDetected = false
                    saveState()
                    return
                }
                val stepsDuringReset = rawValue.toInt().coerceAtLeast(0)
                
                // Sanity check: if steps during reset > 1000, likely a sensor glitch not real reboot
                // Real reboots typically show 0-500 steps during sensor initialization (~10-30 seconds)
                // If someone walks 1000+ steps in that time, sensor would need multiple readings anyway
                if (stepsDuringReset > 1000) {
                    // Treat as sensor glitch - reset baseline without adding steps
                    sensorBase = rawValue
                    sensorResetDetected = false
                    saveState()
                    return
                }
                
                // Check for overflow when adding to preRebootSteps
                val todayStepsLong = preRebootSteps.toLong() + stepsDuringReset.toLong()
                if (todayStepsLong > Int.MAX_VALUE) {
                    // Overflow protection - cap at Int.MAX_VALUE
                    todaySteps = Int.MAX_VALUE
                } else {
                    todaySteps = todayStepsLong.toInt()
                }
                
                // Update preRebootSteps to the new total for future calculations
                preRebootSteps = todaySteps
                sensorBase = rawValue
                sensorResetDetected = false
                saveState()
            } else if (sensorBase < 0) {
                // First time initialization
                sensorBase = rawValue
                saveState()
                return
            } else if (rawValue < sensorBase) {
                // Sensor reset detected (device reboot or sensor restart)
                // Save current steps as pre-reboot steps
                preRebootSteps = todaySteps
                // Set flag to handle next reading specially
                sensorResetDetected = true
                sensorBase = -1L  // Force re-initialization on next reading
                saveState()
                return
            } else {
                // Detect massive forward jump (sensor glitch, not normal walking)
                // A jump of >50000 steps is impossible in one reading (would need 6+ hours of continuous walking)
                // Check as Long to prevent integer overflow
                val stepsSinceLastReadingLong = rawValue - sensorBase
                if (stepsSinceLastReadingLong > 50000) {
                    // Treat as sensor glitch - reset baseline to current value without adding steps
                    sensorBase = rawValue
                    saveState()
                    return
                }

                // Calculate new steps: pre-reboot steps + steps since new baseline
                val newStepsFromSensor = (rawValue - sensorBase).toInt().coerceAtLeast(0)
                
                // Check for overflow in totalSteps calculation
                val totalStepsLong = preRebootSteps.toLong() + newStepsFromSensor.toLong()
                if (totalStepsLong > Int.MAX_VALUE) {
                    // Overflow protection - cap at Int.MAX_VALUE
                    // This would take walking ~1 billion steps per day (impossible)
                    // But handle gracefully just in case
                    todaySteps = Int.MAX_VALUE
                    saveState()
                } else {
                    val totalSteps = totalStepsLong.toInt()
                    if (totalSteps > todaySteps) {
                        todaySteps = totalSteps
                        lastUpdateTime = SystemClock.elapsedRealtime()
                        saveState()
                    }
                    // If stepIncrease <= 0, no update (prevents decreasing)
                }
            }
        } // end synchronized
        
        // Emit updates outside synchronized block to avoid holding lock during I/O
        emitSteps()
        updateNotification()
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun registerSensor() {
        stepSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    private fun resetSteps() {
        synchronized(this) {
            todaySteps = 0
            preRebootSteps = 0
            sensorBase = if (latestSensorValue >= 0) latestSensorValue else -1L
            sensorResetDetected = false
            lastUpdateTime = 0  // Reset rate limiting timer
            saveState()
        }
        emitSteps()
        updateNotification()
    }

    private fun loadPersistedState() {
        // Use local timezone to match JS side
        val today = try {
            LocalDate.now(java.time.ZoneId.systemDefault()).format(DateTimeFormatter.ISO_LOCAL_DATE)
        } catch (e: Exception) {
            // Clock error - use empty string, will force reset
            ""
        }
        
        val prefsInstance = prefs ?: return  // Exit if prefs unavailable
        val savedDate = prefsInstance.getString(PREF_DATE, "") ?: ""
        
        var previousDateToArchive = ""
        var previousStepsToArchive = 0

        synchronized(this) {
            if (savedDate == today && savedDate.isNotEmpty()) {
                todaySteps = prefsInstance.getInt(PREF_STEPS, 0)
                sensorBase = prefsInstance.getLong(PREF_SENSOR_BASE, -1L)
                preRebootSteps = prefsInstance.getInt(PREF_PRE_REBOOT_STEPS, 0)
                latestSensorValue = prefsInstance.getLong(PREF_LATEST_SENSOR_VALUE, -1L)
            } else {
                if (savedDate.isNotEmpty()) {
                    previousDateToArchive = savedDate
                    previousStepsToArchive = prefsInstance.getInt(PREF_STEPS, 0)
                }
                todaySteps = 0
                sensorBase = -1L
                preRebootSteps = 0
                latestSensorValue = -1L
            }
            currentDate = today
        }

        if (previousDateToArchive.isNotEmpty() && previousStepsToArchive > 0) {
            saveDailyStepsToDatabase(previousDateToArchive, previousStepsToArchive)
        }
    }

    private fun saveState() {
        val prefsInstance = prefs ?: return  // Exit if prefs unavailable
        try {
            prefsInstance.edit()
                .putInt(PREF_STEPS, todaySteps)
                .putString(PREF_DATE, currentDate)
                .putLong(PREF_SENSOR_BASE, sensorBase)
                .putInt(PREF_PRE_REBOOT_STEPS, preRebootSteps)
                .putLong(PREF_LATEST_SENSOR_VALUE, latestSensorValue)
                .apply()
        } catch (e: Exception) {
            // Save failed - continue without persisting
        }
    }

    private fun getReactContext(): ReactContext? {
        return try {
            val app = applicationContext as? ReactApplication ?: return null
            app.reactHost?.currentReactContext
        } catch (e: Exception) { null }
    }

    private fun emitSteps() {
        try {
            val reactContext = getReactContext() ?: return
            
            // Thread-safe read of todaySteps
            val safeSteps: Int
            synchronized(this) {
                safeSteps = todaySteps.coerceIn(0, Int.MAX_VALUE)
            }
            val distance = (safeSteps * STEP_LENGTH_M).coerceAtLeast(0f)
            val calories = (safeSteps * CAL_PER_STEP).coerceAtLeast(0f)
            
            val json = JSONObject().apply {
                put("steps", safeSteps)
                put("distance", distance.toDouble())
                put("calories", calories.toDouble())
            }.toString()
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("STEP_UPDATE", json)
        } catch (e: Exception) {
            // React context not ready or JSON error - silently fail
        }
    }

    private fun emitStatus(status: String) {
        val reactContext = getReactContext() ?: return
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("STEP_STATUS", status)
        } catch (e: Exception) {
            // React context not ready
        }
    }

    // ── Notification ──────────────────────────────────────────────────────────

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Step Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Shows step count while tracking is active"
                setShowBadge(false)
            }
            getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        }
    }

    private fun buildNotification(): Notification {
        val openIntent = packageManager.getLaunchIntentForPackage(packageName)?.let {
            PendingIntent.getActivity(this, 0, it, PendingIntent.FLAG_IMMUTABLE)
        }

        // Thread-safe read of volatile and synchronized variables
        val paused = isPaused
        val steps: Int
        synchronized(this) {
            steps = todaySteps
        }

        val pauseOrResumeIntent = PendingIntent.getService(
            this, 1,
            getIntent(this).apply { action = if (paused) ACTION_RESUME else ACTION_PAUSE },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        
        val statusText = if (paused) "Paused" else "$steps steps today"
        val actionLabel = if (paused) "Resume" else "Pause"

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setColor(0xFF12141C.toInt())
            .setColorized(false)
            .setContentTitle("Tracker")
            .setContentText(statusText)
            .setContentIntent(openIntent)
            .addAction(0, actionLabel, pauseOrResumeIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)

        // Try to set large icon, but handle failure gracefully
        try {
            val largeIcon = android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher)
            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon)
            }
        } catch (e: Exception) {
            // Resource not found or decoding failed - continue without large icon
        }

        return builder.build()
    }

    private fun updateNotification() {
        if (isDestroyed) return  // Don't update if service is destroyed
        
        try {
            getSystemService(NotificationManager::class.java)
                ?.notify(NOTIFICATION_ID, buildNotification())
        } catch (e: Exception) {
            // Service destroyed or notification manager unavailable
        }
    }

    private fun acquireWakeLock() {
        try {
            val pm = getSystemService(Context.POWER_SERVICE) as? PowerManager
            if (pm == null) {
                // PowerManager not available
                return
            }
            // Only acquire if not already held to prevent reference count leak
            if (wakeLock == null || wakeLock?.isHeld == false) {
                wakeLock = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "TrackerApp::StepCounterWakeLock"
                ).apply { 
                    // Acquire indefinitely - foreground service doesn't need timeout
                    // Will be released properly in onDestroy
                    // Android won't kill foreground service, so no crash risk
                    acquire()
                }
            }
        } catch (e: Exception) {
            // WakeLock acquisition failed - continue without it
            // Service will still work but may be killed more aggressively
        }
    }

    // ── Database Sync ─────────────────────────────────────────────────────────

    private fun getDatabase(readOnly: Boolean = false): android.database.sqlite.SQLiteDatabase? {
        try {
            val appFilesDir = applicationContext.filesDir
            val possiblePaths = mutableListOf<java.io.File>()
            
            // Expo SQLite path (primary for Expo)
            val sqliteDir = java.io.File(appFilesDir, "SQLite")
            if (sqliteDir.exists()) {
                possiblePaths.add(java.io.File(sqliteDir, "tracker.db"))
            }
            
            // Standard Android path
            possiblePaths.add(applicationContext.getDatabasePath("tracker.db"))
            
            // Check all subdirectories in files
            appFilesDir?.listFiles()?.forEach { dir ->
                if (dir.isDirectory) {
                    val trackerDb = java.io.File(dir, "tracker.db")
                    if (trackerDb.exists()) {
                        possiblePaths.add(trackerDb)
                    }
                }
            }
            
            for (path in possiblePaths) {
                if (path.exists()) {
                    val flags = if (readOnly) android.database.sqlite.SQLiteDatabase.OPEN_READONLY else android.database.sqlite.SQLiteDatabase.OPEN_READWRITE
                    return android.database.sqlite.SQLiteDatabase.openDatabase(
                        path.path, null, flags
                    )
                }
            }
        } catch (e: Exception) {
            // Silently fail
        }
        return null
    }

    private fun saveDailyStepsToDatabase(date: String, steps: Int) {
        if (date.isEmpty() || steps <= 0) return
        var db: android.database.sqlite.SQLiteDatabase? = null
        var cursor: android.database.Cursor? = null
        try {
            db = getDatabase(readOnly = false) ?: return
            val distance = (steps * STEP_LENGTH_M).toDouble()
            val calories = (steps * CAL_PER_STEP).toDouble()
            val now = System.currentTimeMillis()
            
            var goal = 8000
            try {
                cursor = db.rawQuery("SELECT daily_goal FROM step_tracking_state WHERE id = 1", null)
                if (cursor.moveToFirst()) {
                    goal = cursor.getInt(0)
                }
            } catch (e: Exception) {
                // Ignore query error, use default goal 8000
            } finally {
                cursor?.close()
                cursor = null
            }
            
            val goalMet = if (steps >= goal) 1 else 0
            
            var existingSteps = -1
            try {
                cursor = db.rawQuery("SELECT steps FROM daily_steps WHERE date = ?", arrayOf(date))
                if (cursor.moveToFirst()) {
                    existingSteps = cursor.getInt(0)
                }
            } catch (e: Exception) {
                // Ignore query error
            } finally {
                cursor?.close()
                cursor = null
            }
            
            if (existingSteps < steps) {
                db.execSQL(
                    """INSERT INTO daily_steps (date, steps, distance_m, calories, goal, goal_met, created_at, updated_at)
                       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                       ON CONFLICT(date) DO UPDATE SET
                         steps = ?,
                         distance_m = ?,
                         calories = ?,
                         goal_met = ?,
                         updated_at = ?""",
                    arrayOf(
                        date, steps, distance, calories, goal, goalMet, now, now,
                        steps, distance, calories, goalMet, now
                    )
                )
            }
        } catch (e: Exception) {
            // Silently fail
        } finally {
            db?.close()
        }
    }

    private fun loadPauseStateFromDatabase() {
        var db: android.database.sqlite.SQLiteDatabase? = null
        var cursor: android.database.Cursor? = null
        try {
            db = getDatabase(readOnly = true) ?: return
            
            cursor = db.rawQuery(
                "SELECT is_paused FROM step_tracking_state WHERE id = 1", null
            )
            
            if (cursor.moveToFirst()) {
                val pausedFromDb = cursor.getInt(0) == 1
                synchronized(this) {
                    isPaused = pausedFromDb
                }
                
                // Delay emission to give React Native time to subscribe
                // Use a handler to emit after a short delay
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                    emitStatus(if (pausedFromDb) "paused" else "tracking")
                }, 500)  // 500ms delay
            }
        } catch (e: Exception) {
            // Silently fail
        } finally {
            cursor?.close()
            db?.close()
        }
    }

    private fun updateDatabasePauseState(paused: Boolean) {
        var db: android.database.sqlite.SQLiteDatabase? = null
        try {
            db = getDatabase(readOnly = false) ?: return
            
            // Get current timestamp in milliseconds
            val now = System.currentTimeMillis()
            
            // Use INSERT OR REPLACE to ensure row exists
            // Set is_tracking=1 to indicate tracking is enabled (just paused/resumed)
            // This handles both creating the row and updating it
            db.execSQL(
                "INSERT OR REPLACE INTO step_tracking_state (id, is_tracking, is_paused, updated_at) VALUES (1, 1, ?, ?)",
                arrayOf(if (paused) 1 else 0, now)
            )
        } catch (e: Exception) {
            // Silently fail
        } finally {
            db?.close()
        }
    }
}
