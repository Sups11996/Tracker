import { create } from 'zustand';
import type { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/supabase.types';

type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];

interface UserState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  setProfile: (profile: UserProfile | null) => void;
  fetchProfile: (userId: string) => Promise<void>;
  createProfile: (userId: string, username: string) => Promise<void>;
  clearProfile: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  isLoading: false,
  error: null,

  setProfile: (profile) => set({ profile }),

  clearProfile: () => set({ profile: null, error: null }),

  fetchProfile: async (userId: string) => {
    set({ isLoading: true, error: null });
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // PGRST116 = row not found — user has no profile yet (normal at first launch)
      const noProfile = error.code === 'PGRST116';
      set({ profile: null, isLoading: false, error: noProfile ? null : error.message });
    } else {
      set({ profile: data as UserProfile, isLoading: false });
    }
  },

  createProfile: async (userId: string, username: string) => {
    set({ isLoading: true, error: null });
    const now = new Date().toISOString();

    const payload: ProfileInsert = {
      id: userId,
      username: username.trim().toLowerCase(),
      created_at: now,
      updated_at: now,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(payload)
      .select()
      .single();

    if (error) {
      set({ isLoading: false, error: error.message });
      throw error;
    }
    set({ profile: data as UserProfile, isLoading: false });
  },
}));
