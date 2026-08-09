package com.trackerapp.personal

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * React Native package for registering the PermissionsModule.
 */
class PermissionsPackage : ReactPackage {
    
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(PermissionsModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
