import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { SavedAmbientLink } from "@/types";
import type { Database } from "@/types/database";

type AmbientLinkRow = Database["public"]["Tables"]["ambient_links"]["Row"];

function rowToLink(row: AmbientLinkRow): SavedAmbientLink {
  return { id: row.id, userId: row.user_id, label: row.label, url: row.url, createdAt: row.created_at };
}

interface AmbientLinksState {
  links: SavedAmbientLink[];
  loading: boolean;
  fetchLinks: () => Promise<void>;
  addLink: (label: string, url: string) => Promise<SavedAmbientLink | null>;
  deleteLink: (id: string) => Promise<void>;
}

export const useAmbientLinksStore = create<AmbientLinksState>((set, get) => ({
  links: [],
  loading: false,

  fetchLinks: async () => {
    set({ loading: true });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false, links: [] });
      return;
    }
    const { data } = await supabase
      .from("ambient_links")
      .select("*")
      .order("created_at", { ascending: false });
    set({ links: (data ?? []).map(rowToLink), loading: false });
  },

  addLink: async (label, url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return null;
    // Already saved — just reuse the existing row instead of hitting the unique(user_id, url) constraint.
    const existing = get().links.find((l) => l.url === trimmedUrl);
    if (existing) return existing;

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return null;

    const { data, error } = await supabase
      .from("ambient_links")
      .insert({ user_id: userData.user.id, label: label.trim() || "Untitled", url: trimmedUrl })
      .select()
      .single();
    if (error || !data) {
      console.error("addLink failed:", error?.message ?? "no row returned");
      return null;
    }

    const link = rowToLink(data);
    set({ links: [link, ...get().links] });
    return link;
  },

  deleteLink: async (id) => {
    set({ links: get().links.filter((l) => l.id !== id) });
    await supabase.from("ambient_links").delete().eq("id", id);
  },
}));
