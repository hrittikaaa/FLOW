import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  user: User | null;
  initializing: boolean;
  authError: string | null;

  init: () => () => void; // returns an unsubscribe fn
  signInWithPassword: (email: string, password: string) => Promise<boolean>;
  signUpWithPassword: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  updatePassword: (password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  initializing: true,
  authError: null,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, initializing: false });
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, initializing: false });
    });

    return () => listener.subscription.unsubscribe();
  },

  signInWithPassword: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  signUpWithPassword: async (email, password) => {
    set({ authError: null });
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  signInWithGoogle: async () => {
    set({ authError: null });
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app` },
    });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    // Browser is redirected to Google; nothing more to do here.
    return true;
  },

  sendPasswordReset: async (email) => {
    set({ authError: null });
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  updatePassword: async (password) => {
    set({ authError: null });
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      set({ authError: error.message });
      return false;
    }
    return true;
  },

  signOut: async () => {
    await supabase.auth.signOut();
  },
}));
