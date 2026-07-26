/**
 * Hand-authored Supabase database types.
 *
 * When you connect to a real Supabase project, replace this file with the
 * output of:
 *   npx supabase gen types typescript --project-id <id> > src/lib/supabase.types.ts
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          updated_at?: string;
        };
        // Required by @supabase/supabase-js GenericTable
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
