import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { QueueItem } from "@/types";
import type { Database } from "@/types/database";

type QueueItemRow = Database["public"]["Tables"]["queue_items"]["Row"];

function rowToItem(row: QueueItemRow): QueueItem {
  return row.kind === "break"
    ? { id: row.id, kind: "break", minutes: row.break_minutes ?? 5 }
    : { id: row.id, kind: "block", blockId: row.block_id as string };
}

/** The shape callers build up client-side before persisting — no id yet, that comes back from the
 *  insert. Written out explicitly (rather than `Omit<QueueItem, "id">`) because `Omit` doesn't
 *  distribute over a union — it would otherwise collapse to just `{ kind: "block" | "break" }`. */
type QueueItemDraft = { kind: "block"; blockId: string } | { kind: "break"; minutes: number };

interface QueueState {
  items: QueueItem[];
  loading: boolean;

  fetchQueue: () => Promise<void>;
  /** Replaces the entire ordered queue — every mutation (reorder, add, remove,
   *  edit a break) goes through this single all-at-once persist, mirroring the
   *  "delete mine, insert the fresh list" pattern used elsewhere in this app. */
  setItems: (items: QueueItemDraft[]) => Promise<void>;

  addBlock: (blockId: string) => Promise<void>;
  removeBlock: (blockId: string) => Promise<void>;
  addBreak: (afterIndex: number, minutes?: number) => Promise<void>;
  removeAt: (index: number) => Promise<void>;
  updateBreakMinutes: (id: string, minutes: number) => Promise<void>;
  reorder: (fromIndex: number, toIndex: number) => Promise<void>;
  clear: () => Promise<void>;
}

export const useQueueStore = create<QueueState>((set, get) => ({
  items: [],
  loading: false,

  fetchQueue: async () => {
    set({ loading: true });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false, items: [] });
      return;
    }
    const { data } = await supabase
      .from("queue_items")
      .select("*")
      .order("position", { ascending: true });
    set({ items: (data ?? []).map(rowToItem), loading: false });
  },

  setItems: async (items) => {
    // Optimistic local ids so the UI updates instantly; replaced with the real
    // DB-generated ids once the persist round-trip completes.
    const optimistic: QueueItem[] = items.map((item) => ({ ...item, id: crypto.randomUUID() } as QueueItem));
    set({ items: optimistic });

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    const userId = userData.user.id;

    await supabase.from("queue_items").delete().eq("user_id", userId);
    if (items.length === 0) return;

    const rows = items.map((item, i) => ({
      user_id: userId,
      position: i,
      kind: item.kind,
      block_id: item.kind === "block" ? item.blockId : null,
      break_minutes: item.kind === "break" ? item.minutes : null,
    }));
    const { data } = await supabase.from("queue_items").insert(rows).select();
    if (data) {
      set({ items: data.sort((a, b) => a.position - b.position).map(rowToItem) });
    }
  },

  addBlock: async (blockId) => {
    const { items, setItems } = get();
    if (items.some((i) => i.kind === "block" && i.blockId === blockId)) return;
    await setItems([...items, { kind: "block", blockId }]);
  },

  removeBlock: async (blockId) => {
    const { items, setItems } = get();
    await setItems(items.filter((i) => !(i.kind === "block" && i.blockId === blockId)));
  },

  addBreak: async (afterIndex, minutes = 5) => {
    const { items, setItems } = get();
    const next: QueueItemDraft[] = [...items];
    next.splice(afterIndex + 1, 0, { kind: "break", minutes });
    await setItems(next);
  },

  removeAt: async (index) => {
    const { items, setItems } = get();
    await setItems(items.filter((_, i) => i !== index));
  },

  updateBreakMinutes: async (id, minutes) => {
    const { items, setItems } = get();
    await setItems(
      items.map((item) => (item.id === id && item.kind === "break" ? { ...item, minutes: Math.max(1, minutes) } : item))
    );
  },

  reorder: async (fromIndex, toIndex) => {
    const { items, setItems } = get();
    if (fromIndex === toIndex) return;
    const next = [...items];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    await setItems(next);
  },

  clear: async () => {
    await get().setItems([]);
  },
}));
