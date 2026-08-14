#!/usr/bin/env node
/**
 * Patches native modules to fix C++ linking issues with Android NDK 27
 * This script runs automatically after npm install
 */

const fs = require('fs');
const path = require('path');

console.log('Patching native modules for Android NDK 27...\n');

// Patch react-native-gesture-handler
const gestureHandlerCMake = path.join(__dirname, '../node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt');
if (fs.existsSync(gestureHandlerCMake)) {
  let content = fs.readFileSync(gestureHandlerCMake, 'utf8');
  if (!content.includes('c++_shared')) {
    content = content.replace(
      /(target_link_libraries\s*\(\s*\$\{PACKAGE_NAME\})/,
      '$1\n  c++_shared'
    );
    fs.writeFileSync(gestureHandlerCMake, content);
    console.log('* Patched react-native-gesture-handler');
  } else {
    console.log('- react-native-gesture-handler already patched');
  }
} else {
  console.log('! react-native-gesture-handler CMakeLists.txt not found');
}

// Patch expo-modules-core jsi.cmake
const expoModulesJsiCMake = path.join(__dirname, '../node_modules/expo-modules-core/android/cmake/jsi.cmake');
if (fs.existsSync(expoModulesJsiCMake)) {
  let content = fs.readFileSync(expoModulesJsiCMake, 'utf8');
  if (!content.includes('target_link_libraries')) {
    // Add target_link_libraries for expo-modules-jsi
    content = content.replace(
      /(target_include_directories\s*\(\s*expo-modules-jsi[\s\S]*?\))/,
      '$1\n\n# Link c++_shared for PCH compilation\ntarget_link_libraries(\n  expo-modules-jsi\n  PRIVATE\n  c++_shared\n)'
    );
    fs.writeFileSync(expoModulesJsiCMake, content);
    console.log('* Patched expo-modules-core/jsi.cmake');
  } else {
    console.log('- expo-modules-core/jsi.cmake already patched');
  }
} else {
  console.log('! expo-modules-core/jsi.cmake not found');
}

console.log('\nNative module patching complete!\n');
