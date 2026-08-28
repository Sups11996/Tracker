package com.trackerapp.personal

import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import java.time.LocalDate
import java.time.format.DateTimeFormatter

class StepServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StepServiceModule"

    @ReactMethod
    fun getStepData(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (context == null) {
                promise.reject("CONTEXT_ERROR", "React context not available")
                return
            }
            val prefs = context.getSharedPreferences(StepCounterService.PREF_NAME, Context.MODE_PRIVATE)
            val today = try {
                LocalDate.now(java.time.ZoneId.systemDefault()).format(DateTimeFormatter.ISO_LOCAL_DATE)
            } catch (e: Exception) {
                ""
            }
            val savedDate = prefs.getString(StepCounterService.PREF_DATE, "") ?: ""
            val steps = if (savedDate == today && savedDate.isNotEmpty()) {
                prefs.getInt(StepCounterService.PREF_STEPS, 0)
            } else {
                0
            }
            val distance = (steps * StepCounterService.STEP_LENGTH_M).toDouble()
            val calories = (steps * StepCounterService.CAL_PER_STEP).toDouble()

            val map = Arguments.createMap().apply {
                putInt("steps", steps)
                putDouble("distance", distance)
                putDouble("calories", calories)
                putString("date", today)
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("GET_STEPS_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (context == null) {
                promise.reject("CONTEXT_ERROR", "React context not available")
                return
            }
            
            val intent = StepCounterService.getIntent(context)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val context = reactApplicationContext
            if (context == null) {
                promise.reject("CONTEXT_ERROR", "React context not available")
                return
            }
            
            val intent = StepCounterService.getIntent(context)
            context.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun sendAction(action: String, promise: Promise) {
        try {
            val context = reactApplicationContext
            if (context == null) {
                promise.reject("CONTEXT_ERROR", "React context not available")
                return
            }
            
            val intent = StepCounterService.getIntent(context).apply {
                this.action = action
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message, e)
        }
    }
}
