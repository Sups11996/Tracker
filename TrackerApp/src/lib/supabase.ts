import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import type { Database } from './supabase.types';

// ---------------------------------------------------------------------------
// Environment variables
// ---------------------------------------------------------------------------
// Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to a .env
// file at the project root. Expo automatically exposes EXPO_PUBLIC_* vars.
// ---------------------------------------------------------------------------
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

if (__DEV__ && (!SUPABASE_URL || !SUPABASE_ANON_KEY)) {
  console.warn(
    '[Supabase] Missing env vars. Create a .env file with:\n' +
    '  EXPO_PUBLIC_SUPABASE_URL=...\n' +
    '  EXPO_PUBLIC_SUPABASE_ANON_KEY=...'
  );
}

// ---------------------------------------------------------------------------
// SecureStore adapter — replaces the default localStorage-based storage
// so auth tokens are stored in the device's secure enclave.
// ---------------------------------------------------------------------------
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
