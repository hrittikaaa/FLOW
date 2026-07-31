import { create } from "zustand";
import { supabase } from "@/lib/supabase";

export interface ProfileDefaults {
  displayName: string | null;
  defaultFocusMinutes: number;
  defaultBreakMinutes: number;
  defaultLongBreakMinutes: number;
  sessionsBeforeLongBreak: number;
}

interface ProfileState {
  profile: ProfileDefaults | null;
  loading: boolean;
  fetchProfile: () => Promise<void>;
  updateDefaults: (patch: Partial<ProfileDefaults>) => Promise<void>;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  loading: false,

  fetchProfile: async () => {
    set({ loading: true });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false });
      return;
    }
    const { data } = await supabase.from("profiles").select("*").eq("id", userData.user.id).single();
    if (data) {
      set({
        profile: {
          displayName: data.display_name,
          defaultFocusMinutes: data.default_focus_minutes,
          defaultBreakMinutes: data.default_break_minutes,
          defaultLongBreakMinutes: data.default_long_break_minutes,
          sessionsBeforeLongBreak: data.sessions_before_long_break,
        },
        loading: false,
      });
    } else {
      set({ loading: false });
    }
  },

  updateDefaults: async (patch) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const current = get().profile;
    const next = { ...current, ...patch } as ProfileDefaults;
    set({ profile: next });

    await supabase
      .from("profiles")
      .update({
        display_name: next.displayName,
        default_focus_minutes: next.defaultFocusMinutes,
        default_break_minutes: next.defaultBreakMinutes,
        default_long_break_minutes: next.defaultLongBreakMinutes,
        sessions_before_long_break: next.sessionsBeforeLongBreak,
      })
      .eq("id", userData.user.id);
  },
}));
