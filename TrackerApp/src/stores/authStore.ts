import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;

  // Actions
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  isLoading: false,
  isInitialized: false,

  setSession: (session) => set({ session }),

  setLoading: (isLoading) => set({ isLoading }),

  signOut: async () => {
    set({ isLoading: true });
    await supabase.auth.signOut();
    set({ session: null, isLoading: false });
  },

  initialize: async () => {
    set({ isLoading: true });

    // Try to restore an existing session first
    const { data: existing } = await supabase.auth.getSession();

    if (existing.session) {
      // Returning user — session restored from SecureStore
      set({ session: existing.session, isLoading: false, isInitialized: true });
    } else {
      // First launch — create an anonymous session so the user
      // has an auth identity before they set up their username
      const { data: anon, error } = await supabase.auth.signInAnonymously();
      if (error) {
        console.error('[Auth] Anonymous sign-in failed:', error.message);
      }
      set({
        session: anon?.session ?? null,
        isLoading: false,
        isInitialized: true,
      });
    }

    // Keep session in sync with any future auth state changes
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
    });
  },
}));
