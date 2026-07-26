export interface UserProfile {
  id: string;           // Supabase auth UUID
  username: string;     // unique display name chosen at onboarding
  created_at: string;   // ISO timestamp
  updated_at: string;
}
