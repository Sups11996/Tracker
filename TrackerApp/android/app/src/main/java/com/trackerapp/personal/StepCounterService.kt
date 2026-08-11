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
import androidx.core.app.NotificationCompat
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlinx.coroutines.*
import org.json.JSONObject
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import kotlin.math.roundToInt

class StepCounterService : Service(), SensorEventListener {

    companion object {
        const val CHANNEL_ID = "step_tracking_channel"
        const val NOTIFICATION_ID = 1001
        const val ACTION_PAUSE = "pause"
        const val ACTION_RESUME = "resume"
        const val ACTION_RESET = "reset"
        const val PREF_NAME = "step_prefs"
        const val PREF_STEPS = "steps"
        const val PREF_DATE = "date"
        const val PREF_SENSOR_BASE = "sensor_base"
        const val PREF_PRE_REBOOT_STEPS = "pre_reboot_steps"
        // Average step length: 0.762m, calories per step: 0.04 kcal
        const val STEP_LENGTH_M = 0.762f
        const val CAL_PER_STEP = 0.04f

        fun getIntent(context: Context): Intent = Intent(context, StepCounterService::class.java)
    }

    private lateinit var sensorManager: SensorManager
    private var stepSensor: Sensor? = null
    private var wakeLock: PowerManager.WakeLock? = null

    private var todaySteps = 0
    private var sensorBase = -1L   // raw sensor value at service start or reset
    private var preRebootSteps = 0  // steps before sensor reset (preserved across reboot)
    private var sensorResetDetected = false  // flag to skip first reading after reset
    private var latestSensorValue = -1L  // tracks sensor value even when paused
    private var currentDate = ""
    private var isPaused = false

    private val prefs get() = getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)

    override fun onCreate() {
        super.onCreate()
        sensorManager = getSystemService(Context.SENSOR_SERVICE) as SensorManager
        stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
        createNotificationChannel()
        acquireWakeLock()
        loadPersistedState()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        when (action) {
            ACTION_PAUSE  -> { 
                isPaused = true
                updateDatabasePauseState(true)
                emitStatus("paused")
                updateNotification()
            }
            ACTION_RESUME -> { 
                isPaused = false
                
                // Reset baseline to latest sensor value to discard steps accumulated during pause
                if (latestSensorValue >= 0) {
                    preRebootSteps = todaySteps  // Save current steps before resetting baseline
                    sensorBase = latestSensorValue
                }
                
                updateDatabasePauseState(false)
                emitStatus("tracking")
                updateNotification()
            }
            ACTION_RESET  -> resetSteps()
            else -> {
                startForeground(NOTIFICATION_ID, buildNotification())
                registerSensor()
                loadPauseStateFromDatabase()
            }
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        sensorManager.unregisterListener(this)
        wakeLock?.release()
        emitStatus("paused")
    }

    override fun onBind(intent: Intent?): IBinder? = null

    // ── Sensor ────────────────────────────────────────────────────────────────

    override fun onSensorChanged(event: SensorEvent?) {
        event ?: return
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return

        val rawValue = event.values[0].toLong()
        
        // Always track the latest sensor value, even when paused
        latestSensorValue = rawValue
        
        // Check if date changed (do this even when paused to reset at midnight)
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        if (today != currentDate) {
            currentDate = today
            sensorBase = rawValue
            todaySteps = 0
            preRebootSteps = 0
            sensorResetDetected = false
            saveState()
            emitSteps()  // Emit zero steps for new day
            updateNotification()
            // Don't return - continue to handle pause state
        }
        
        // If paused, don't process steps but keep tracking sensor
        if (isPaused) return

        if (sensorResetDetected) {
            // First reading after reset - use this as new baseline
            // BUT FIRST: Add any steps taken between reset detection and this reading
            val stepsDuringReset = (rawValue - 0).toInt().coerceAtLeast(0)
            
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
            
            todaySteps = preRebootSteps + stepsDuringReset
            
            // Update preRebootSteps to the new total for future calculations
            preRebootSteps = todaySteps
            sensorBase = rawValue
            sensorResetDetected = false
            saveState()
            emitSteps()
            updateNotification()
            return
        }

        if (sensorBase < 0) {
            // First time initialization
            sensorBase = rawValue
            saveState()
            return
        }
        
        if (rawValue < sensorBase) {
            // Sensor reset detected (device reboot or sensor restart)
            // Save current steps as pre-reboot steps
            preRebootSteps = todaySteps
            // Set flag to handle next reading specially
            sensorResetDetected = true
            sensorBase = -1L  // Force re-initialization on next reading
            saveState()
            return
        }
        
        // Detect massive forward jump (sensor glitch, not normal walking)
        // A jump of >50000 steps is impossible in one reading (would need 6+ hours of continuous walking)
        val stepsSinceLastReading = (rawValue - sensorBase).toInt()
        if (stepsSinceLastReading > 50000) {
            // Treat as sensor glitch - reset baseline to current value without adding steps
            sensorBase = rawValue
            saveState()
            return
        }

        // Calculate new steps: pre-reboot steps + steps since new baseline
        val newStepsFromSensor = (rawValue - sensorBase).toInt().coerceAtLeast(0)
        val totalSteps = preRebootSteps + newStepsFromSensor
        
        // Only update if steps increased (prevent sensor noise from decreasing count)
        if (totalSteps > todaySteps) {
            todaySteps = totalSteps
            saveState()
            emitSteps()
            updateNotification()
        }
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun registerSensor() {
        stepSensor?.let {
            sensorManager.registerListener(this, it, SensorManager.SENSOR_DELAY_NORMAL)
        }
    }

    private fun resetSteps() {
        todaySteps = 0
        preRebootSteps = 0
        sensorBase = -1L
        sensorResetDetected = false
        saveState()
        emitSteps()
        updateNotification()
    }

    private fun loadPersistedState() {
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        val savedDate = prefs.getString(PREF_DATE, "")
        if (savedDate == today) {
            todaySteps = prefs.getInt(PREF_STEPS, 0)
            sensorBase = prefs.getLong(PREF_SENSOR_BASE, -1L)
            preRebootSteps = prefs.getInt(PREF_PRE_REBOOT_STEPS, 0)
        } else {
            todaySteps = 0
            sensorBase = -1L
            preRebootSteps = 0
        }
        currentDate = today
    }

    private fun saveState() {
        prefs.edit()
            .putInt(PREF_STEPS, todaySteps)
            .putString(PREF_DATE, currentDate)
            .putLong(PREF_SENSOR_BASE, sensorBase)
            .putInt(PREF_PRE_REBOOT_STEPS, preRebootSteps)
            .apply()
    }

    private fun getReactContext(): ReactContext? {
        return try {
            val app = applicationContext as? ReactApplication ?: return null
            app.reactHost?.currentReactContext
        } catch (e: Exception) { null }
    }

    private fun emitSteps() {
        val reactContext = getReactContext() ?: return
        val distance = todaySteps * STEP_LENGTH_M
        val calories = todaySteps * CAL_PER_STEP
        val json = JSONObject().apply {
            put("steps", todaySteps)
            put("distance", distance)
            put("calories", calories)
        }.toString()
        try {
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit("STEP_UPDATE", json)
        } catch (e: Exception) {
            // React context not ready
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

        val pauseOrResumeIntent = PendingIntent.getService(
            this, 1,
            getIntent(this).apply { action = if (isPaused) ACTION_RESUME else ACTION_PAUSE },
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val statusText = if (isPaused) "Paused" else "$todaySteps steps today"
        val actionLabel = if (isPaused) "Resume" else "Pause"

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setLargeIcon(android.graphics.BitmapFactory.decodeResource(resources, R.mipmap.ic_launcher))
            .setColor(0xFF12141C.toInt())
            .setColorized(false)
            .setContentTitle("Tracker")
            .setContentText(statusText)
            .setContentIntent(openIntent)
            .addAction(0, actionLabel, pauseOrResumeIntent)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .build()
    }

    private fun updateNotification() {
        getSystemService(NotificationManager::class.java)
            ?.notify(NOTIFICATION_ID, buildNotification())
    }

    private fun acquireWakeLock() {
        val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = pm.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "TrackerApp::StepCounterWakeLock"
        ).apply { 
            acquire()  // Acquire indefinitely - will be released in onDestroy
        }
    }

    // ── Database Sync ─────────────────────────────────────────────────────────

    private fun loadPauseStateFromDatabase() {
        try {
            val dbPath = getDatabasePath("tracker.db")
            if (!dbPath.exists()) return
            
            val db = android.database.sqlite.SQLiteDatabase.openDatabase(
                dbPath.path, null, android.database.sqlite.SQLiteDatabase.OPEN_READONLY
            )
            
            val cursor = db.rawQuery(
                "SELECT is_paused FROM step_tracking_state WHERE id = 1", null
            )
            
            if (cursor.moveToFirst()) {
                isPaused = cursor.getInt(0) == 1
            }
            
            cursor.close()
            db.close()
        } catch (e: Exception) {
            // Silently fail
        }
    }

    private fun updateDatabasePauseState(paused: Boolean) {
        try {
            val appFilesDir = applicationContext.filesDir
            val possiblePaths = mutableListOf<java.io.File>()
            
            // Standard Android path
            possiblePaths.add(applicationContext.getDatabasePath("tracker.db"))
            
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
            
            if (dbPath == null) return
            
            val db = android.database.sqlite.SQLiteDatabase.openDatabase(
                dbPath.path, null, android.database.sqlite.SQLiteDatabase.OPEN_READWRITE
            )
            
            db.execSQL(
                "UPDATE step_tracking_state SET is_paused = ? WHERE id = 1",
                arrayOf(if (paused) 1 else 0)
            )
            
            db.close()
        } catch (e: Exception) {
            // Silently fail
        }
    }
}
