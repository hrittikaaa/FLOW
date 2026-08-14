import { create } from "zustand";
import { supabase } from "@/lib/supabase";

/** Built-in categories offered to every user in addition to whatever they add themselves. */
export const COMMON_CATEGORIES = [
  "Coding",
  "Leetcode",
  "Project",
  "Studying",
  "Theory",
  "Lab",
  "Research",
  "Planning",
  "Others",
];

interface CategoriesState {
  customCategories: string[];
  /** Built-in categories this user has "deleted" — hidden from their own pickers only. */
  hiddenCategories: string[];
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<string | null>;
  /** Deletes a custom category outright, or hides a built-in one for this account. */
  deleteCategory: (name: string) => Promise<void>;
  /** Un-hides a previously-deleted built-in category. */
  restoreCategory: (name: string) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  customCategories: [],
  hiddenCategories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false, customCategories: [], hiddenCategories: [] });
      return;
    }
    const [{ data: customRows }, { data: hiddenRows }] = await Promise.all([
      supabase.from("categories").select("name").order("created_at", { ascending: true }),
      supabase.from("hidden_categories").select("name"),
    ]);
    set({
      customCategories: (customRows ?? []).map((r) => r.name),
      hiddenCategories: (hiddenRows ?? []).map((r) => r.name),
      loading: false,
    });
  },

  addCategory: async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return null;
    // Already covered by a built-in or existing custom category — just reuse it.
    const existing = [...COMMON_CATEGORIES, ...get().customCategories].find(
      (c) => c.toLowerCase() === trimmed.toLowerCase()
    );
    if (existing) return existing;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: userData.user.id, name: trimmed })
      .select()
      .single();
    if (error || !data) {
      // Surfaced in the console so a missing `categories` table/migration is easy to spot.
      console.error("addCategory failed:", error?.message ?? "no row returned");
      return null;
    }

    set({ customCategories: [...get().customCategories, data.name] });
    return data.name;
  },

  deleteCategory: async (name) => {
    const isBuiltIn = COMMON_CATEGORIES.includes(name);
    if (isBuiltIn) {
      set({ hiddenCategories: [...get().hiddenCategories, name] });
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      await supabase.from("hidden_categories").insert({ user_id: userData.user.id, name });
      return;
    }
    set({ customCategories: get().customCategories.filter((c) => c !== name) });
    await supabase.from("categories").delete().eq("name", name);
  },

  restoreCategory: async (name) => {
    set({ hiddenCategories: get().hiddenCategories.filter((c) => c !== name) });
    await supabase.from("hidden_categories").delete().eq("name", name);
  },
}));
