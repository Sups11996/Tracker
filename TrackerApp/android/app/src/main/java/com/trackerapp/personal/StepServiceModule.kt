package com.trackerapp.personal

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*

class StepServiceModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StepServiceModule"

    @ReactMethod
    fun startService(promise: Promise) {
        try {
            val intent = StepCounterService.getIntent(reactApplicationContext)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = StepCounterService.getIntent(reactApplicationContext)
            reactApplicationContext.stopService(intent)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun sendAction(action: String, promise: Promise) {
        try {
            val intent = StepCounterService.getIntent(reactApplicationContext).apply {
                this.action = action
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("ACTION_ERROR", e.message, e)
        }
    }
}
