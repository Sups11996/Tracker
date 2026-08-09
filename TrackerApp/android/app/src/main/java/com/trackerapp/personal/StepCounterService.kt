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
        if (isPaused) return
        event ?: return
        if (event.sensor.type != Sensor.TYPE_STEP_COUNTER) return

        val rawValue = event.values[0].toLong()

        // Check if date changed
        val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
        if (today != currentDate) {
            currentDate = today
            sensorBase = rawValue
            todaySteps = 0
            saveState()
        }

        if (sensorBase < 0) {
            // First time initialization
            sensorBase = rawValue
            saveState()
        } else if (rawValue < sensorBase) {
            // Sensor reset detected (device reboot) - preserve existing steps
            // and update baseline to current sensor value
            sensorBase = rawValue
            saveState()
            // todaySteps stays the same (preserved from before reboot)
            return  // Don't recalculate steps this cycle
        }

        val newSteps = (rawValue - sensorBase).toInt().coerceAtLeast(0)
        // Add preserved steps to new steps from sensor
        val totalSteps = todaySteps + newSteps
        
        // Only update if we have NEW steps from sensor
        if (newSteps > 0 && totalSteps != todaySteps) {
            todaySteps = totalSteps
            // Update baseline to current sensor reading
            sensorBase = rawValue
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
        sensorBase = -1L
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
        } else {
            todaySteps = 0
            sensorBase = -1L
        }
        currentDate = today
    }

    private fun saveState() {
        prefs.edit()
            .putInt(PREF_STEPS, todaySteps)
            .putString(PREF_DATE, currentDate)
            .putLong(PREF_SENSOR_BASE, sensorBase)
            .apply()
    }

    private fun getReactContext(): ReactContext? {
        return try {
            val app = applicationContext as? ReactApplication ?: return null
            app.reactHost?.currentReactContext
        } catch (e: Exception) { null }
    }

    private fun emitSteps() {
        val distance = todaySteps * STEP_LENGTH_M
        val calories = todaySteps * CAL_PER_STEP
        val json = JSONObject().apply {
            put("steps", todaySteps)
            put("distance", distance)
            put("calories", calories)
        }.toString()
        getReactContext()
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("STEP_UPDATE", json)
    }

    private fun emitStatus(status: String) {
        getReactContext()
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("STEP_STATUS", status)
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
        ).apply { acquire(10 * 60 * 1000L) } // 10 min max
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
