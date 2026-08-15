#!/usr/bin/env node
/**
 * Post-install script for Android NDK 27 compatibility
 * Runs automatically after npm install
 * 
 * What this script does:
 * 1. Patches native modules to add c++_shared library linking
 * 2. Cleans corrupted build artifacts from previous builds
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running post-install setup for Android NDK 27...\n');

// ============================================================================
// PART 1: PATCH NATIVE MODULES
// ============================================================================

console.log('📦 Patching native modules...\n');

/**
 * Generic patch function for CMakeLists.txt files
 */
function patchCMakeLists(cmakePath, targetName, moduleName) {
  if (fs.existsSync(cmakePath)) {
    let content = fs.readFileSync(cmakePath, 'utf8');
    if (!content.includes('c++_shared')) {
      // Try multiple patterns to match different CMakeLists.txt formats
      let patched = false;
      
      // Pattern 1: Direct target name (e.g., worklets, reanimated)
      const regex1 = new RegExp(`(target_link_libraries\\s*\\(\\s*${targetName}[^\\)]*?)(\\))`, 's');
      
      // Pattern 2: Variable pattern like ${PACKAGE_NAME} or ${LIB_TARGET_NAME}
      const regex2 = /(target_link_libraries\s*\(\s*\$\{[A-Z_]+\}[^\)]*?)(\))/s;
      
      if (regex1.test(content)) {
        content = content.replace(regex1, '$1\n  c++_shared$2');
        patched = true;
      } else if (regex2.test(content)) {
        content = content.replace(regex2, '$1\n  c++_shared$2');
        patched = true;
      }
      
      if (patched) {
        fs.writeFileSync(cmakePath, content);
        console.log(`   ✓ Patched ${moduleName}`);
        return true;
      } else {
        console.log(`   ⚠ ${moduleName} - target_link_libraries not found for ${targetName}`);
        return false;
      }
    } else {
      console.log(`   - ${moduleName} already patched`);
      return true;
    }
  } else {
    console.log(`   ⚠ ${moduleName} CMakeLists.txt not found`);
    return false;
  }
}

// Patch all native modules
patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-gesture-handler/android/src/main/jni/CMakeLists.txt'),
  'gesturehandler',  // Uses ${PACKAGE_NAME} which is set to "gesturehandler"
  'react-native-gesture-handler'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-screens/android/CMakeLists.txt'),
  'rnscreens',
  'react-native-screens'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-worklets/android/CMakeLists.txt'),
  'worklets',
  'react-native-worklets'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-reanimated/android/CMakeLists.txt'),
  'reanimated',
  'react-native-reanimated'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-svg/android/src/main/jni/CMakeLists.txt'),
  'react_codegen_rnsvg',  // Uses "react_codegen_rnsvg" not "rnsvg"
  'react-native-svg'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/react-native-safe-area-context/android/src/main/jni/CMakeLists.txt'),
  'react_codegen_safeareacontext',  // Uses "react_codegen_safeareacontext"
  'react-native-safe-area-context'
);

patchCMakeLists(
  path.join(__dirname, '../node_modules/expo-sqlite/android/CMakeLists.txt'),
  'expo_sqlite',  // Uses "expo_sqlite" with underscore
  'expo-sqlite'
);

// Patch expo-modules-core jsi.cmake
const expoModulesJsiCMake = path.join(__dirname, '../node_modules/expo-modules-core/android/cmake/jsi.cmake');
if (fs.existsSync(expoModulesJsiCMake)) {
  let content = fs.readFileSync(expoModulesJsiCMake, 'utf8');
  if (!content.includes('target_link_libraries')) {
    content = content.replace(
      /(target_include_directories\s*\(\s*expo-modules-jsi[\s\S]*?\))/,
      '$1\n\n# Link c++_shared for PCH compilation\ntarget_link_libraries(\n  expo-modules-jsi\n  PRIVATE\n  c++_shared\n)'
    );
    fs.writeFileSync(expoModulesJsiCMake, content);
    console.log('   ✓ Patched expo-modules-core/jsi.cmake');
  } else {
    console.log('   - expo-modules-core/jsi.cmake already patched');
  }
} else {
  console.log('   ⚠ expo-modules-core/jsi.cmake not found');
}

// ============================================================================
// PART 2: CLEAN BUILD ARTIFACTS
// ============================================================================

console.log('\n🧹 Cleaning build artifacts...\n');

/**
 * Recursively delete a directory
 */
function deleteDirRecursive(dirPath) {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      return true;
    } catch (err) {
      console.log(`   ⚠ Could not delete ${dirPath}: ${err.message}`);
      return false;
    }
  }
  return false;
}

/**
 * Find and delete directories matching a pattern
 */
function cleanDirectories(searchPath, dirName, description) {
  let count = 0;
  
  function walk(dir) {
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        try {
          const stat = fs.statSync(filePath);
          if (stat.isDirectory()) {
            if (file === dirName) {
              if (deleteDirRecursive(filePath)) {
                count++;
              }
            } else if (file !== 'node_modules' && !file.startsWith('.')) {
              walk(filePath);
            }
          }
        } catch (err) {
          // Skip files we can't access
        }
      });
    } catch (err) {
      // Skip directories we can't access
    }
  }
  
  walk(searchPath);
  
  if (count > 0) {
    console.log(`   ✓ Cleaned ${count} ${description} director${count === 1 ? 'y' : 'ies'}`);
  } else {
    console.log(`   - No ${description} directories found`);
  }
}

// Clean .cxx directories (CMake build cache)
cleanDirectories(
  path.join(__dirname, '../node_modules'),
  '.cxx',
  'CMake build cache (.cxx)'
);

// Clean build directories in native modules
const buildDirs = [
  'node_modules/react-native-gesture-handler/android/build',
  'node_modules/react-native-screens/android/build',
  'node_modules/react-native-worklets/android/build',
  'node_modules/react-native-reanimated/android/build',
  'node_modules/react-native-svg/android/build',
  'node_modules/react-native-safe-area-context/android/build',
  'node_modules/expo-sqlite/android/build',
  'node_modules/expo-modules-core/android/build',
  'android/app/.cxx',
  'android/app/build'
];

let cleanedCount = 0;
buildDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);
  if (deleteDirRecursive(fullPath)) {
    cleanedCount++;
  }
});

if (cleanedCount > 0) {
  console.log(`   ✓ Cleaned ${cleanedCount} build artifact director${cleanedCount === 1 ? 'y' : 'ies'}`);
} else {
  console.log(`   - No build artifacts found (this is normal for fresh install)`);
}

// ============================================================================
// DONE
// ============================================================================

console.log('\n✅ Post-install setup complete!\n');
console.log('📝 Next steps:');
console.log('   1. cd android');
console.log('   2. ./gradlew assembleRelease\n');
console.log('💡 The APK will be at: android/app/build/outputs/apk/release/app-release.apk\n');
