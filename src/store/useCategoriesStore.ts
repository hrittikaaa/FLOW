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
  loading: boolean;
  fetchCategories: () => Promise<void>;
  addCategory: (name: string) => Promise<string | null>;
  deleteCategory: (name: string) => Promise<void>;
}

export const useCategoriesStore = create<CategoriesState>((set, get) => ({
  customCategories: [],
  loading: false,

  fetchCategories: async () => {
    set({ loading: true });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false, customCategories: [] });
      return;
    }
    const { data } = await supabase
      .from("categories")
      .select("name")
      .order("created_at", { ascending: true });
    set({ customCategories: (data ?? []).map((r) => r.name), loading: false });
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
    set({ customCategories: get().customCategories.filter((c) => c !== name) });
    await supabase.from("categories").delete().eq("name", name);
  },
}));
