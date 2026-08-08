// Hand-written mirror of supabase/schema.sql, shaped to satisfy postgrest-js's
// GenericTable/GenericSchema constraints (Row/Insert/Update/Relationships).
// Regenerate with `npx supabase gen types typescript --linked` once your
// project is linked for a fully authoritative version.

type NoRelationships = { Relationships: [] };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          default_focus_minutes: number;
          default_break_minutes: number;
          default_long_break_minutes: number;
          sessions_before_long_break: number;
          long_breaks_enabled: boolean;
          time_passed_notify_enabled: boolean;
          time_passed_notify_interval_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["profiles"]["Row"]> & { id: string };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Row"]>;
      } & NoRelationships;
      focus_blocks: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          category: string;
          total_minutes: number;
          focus_minutes: number;
          break_minutes: number;
          long_break_minutes: number;
          sessions_before_long_break: number;
          strict_mode: boolean;
          ambient_sound: string;
          status: string;
          current_segment_index: number;
          elapsed_seconds_in_segment: number;
          last_started_at: string | null;
          completed_minutes: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["focus_blocks"]["Row"]> & {
          user_id: string;
          name: string;
          total_minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["focus_blocks"]["Row"]>;
      } & NoRelationships;
      block_segments: {
        Row: {
          id: string;
          block_id: string;
          position: number;
          kind: string;
          duration_minutes: number;
          is_completed: boolean;
          started_at: string | null;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["block_segments"]["Row"]> & {
          block_id: string;
          position: number;
          kind: string;
          duration_minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["block_segments"]["Row"]>;
      } & NoRelationships;
      tasks: {
        Row: {
          id: string;
          block_id: string;
          user_id: string;
          title: string;
          is_done: boolean;
          position: number;
          rolled_over_from: string | null;
          created_at: string;
          completed_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["tasks"]["Row"]> & {
          block_id: string;
          user_id: string;
          title: string;
        };
        Update: Partial<Database["public"]["Tables"]["tasks"]["Row"]>;
      } & NoRelationships;
      focus_sessions: {
        Row: {
          id: string;
          user_id: string;
          block_id: string | null;
          block_name: string;
          category: string;
          kind: string;
          duration_minutes: number;
          occurred_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["focus_sessions"]["Row"]> & {
          user_id: string;
          block_name: string;
          kind: string;
          duration_minutes: number;
        };
        Update: Partial<Database["public"]["Tables"]["focus_sessions"]["Row"]>;
      } & NoRelationships;
      categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]> & {
          user_id: string;
          name: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      } & NoRelationships;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
