import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { generateSessionPlan } from "@/lib/sessionCalculator";
import type { BlockDraft, BlockSegment, BlockStatus, FocusBlock, SegmentKind, Task } from "@/types";
import type { Database } from "@/types/database";

// Tracks the last time *this* client wrote runtime state for a block, so an
// incoming realtime echo of our own 5-second sync doesn't overwrite smooth
// local per-second ticking with a slightly-stale read.
const recentLocalRuntimeWrites = new Map<string, number>();
// Must be comfortably larger than SYNC_EVERY_N_TICKS (5 s) + network round-trip
// so realtime echoes of our own periodic syncRuntime calls are always suppressed.
// The old 3 s value was shorter than the 5 s sync interval, allowing DB echoes to
// slip through mid-session and overwrite local state with stale values.
const SELF_ECHO_WINDOW_MS = 10_000;

type BlockRow = Database["public"]["Tables"]["focus_blocks"]["Row"];
type SegmentRow = Database["public"]["Tables"]["block_segments"]["Row"];
type TaskRow = Database["public"]["Tables"]["tasks"]["Row"];

function rowToSegment(row: SegmentRow): BlockSegment {
  return {
    id: row.id,
    blockId: row.block_id,
    position: row.position,
    kind: row.kind as SegmentKind,
    durationMinutes: row.duration_minutes,
    isCompleted: row.is_completed,
    startedAt: row.started_at,
    completedAt: row.completed_at,
  };
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    blockId: row.block_id,
    userId: row.user_id,
    title: row.title,
    isDone: row.is_done,
    position: row.position,
    rolledOverFrom: row.rolled_over_from,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  };
}

function rowToBlock(row: BlockRow, segments: SegmentRow[], tasks: TaskRow[]): FocusBlock {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    totalMinutes: row.total_minutes,
    focusMinutes: row.focus_minutes,
    breakMinutes: row.break_minutes,
    longBreakMinutes: row.long_break_minutes,
    sessionsBeforeLongBreak: row.sessions_before_long_break,
    strictMode: row.strict_mode,
    ambientYoutubeUrl: row.ambient_youtube_url,
    ambientVolume: row.ambient_volume,
    status: row.status as BlockStatus,
    currentSegmentIndex: row.current_segment_index,
    elapsedSecondsInSegment: row.elapsed_seconds_in_segment,
    lastStartedAt: row.last_started_at,
    completedMinutes: row.completed_minutes,
    queuePosition: row.queue_position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    segments: segments
      .filter((s) => s.block_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(rowToSegment),
    tasks: tasks
      .filter((t) => t.block_id === row.id)
      .sort((a, b) => a.position - b.position)
      .map(rowToTask),
  };
}

interface BlocksState {
  blocks: FocusBlock[];
  loading: boolean;
  error: string | null;

  fetchBlocks: () => Promise<void>;
  createBlock: (draft: BlockDraft) => Promise<FocusBlock | null>;
  updateBlockMeta: (id: string, patch: Partial<BlockDraft>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  setStatus: (id: string, status: BlockStatus) => Promise<void>;
  /** Sets the exact ordered set of queued block ids — assigns 0-based `queuePosition`
   *  to each, and clears it (null) for any block that was queued but isn't included. */
  setQueue: (orderedBlockIds: string[]) => Promise<void>;

  addTask: (blockId: string, title: string) => Promise<void>;
  toggleTask: (taskId: string, isDone: boolean) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  rolloverTask: (taskId: string, targetBlockId: string) => Promise<void>;

  /** Local-only patch for smooth per-second ticking; call syncRuntime to persist. */
  patchRuntimeLocal: (id: string, patch: Partial<FocusBlock>) => void;
  syncRuntime: (id: string) => Promise<void>;
  markSegmentComplete: (blockId: string, segmentId: string) => Promise<void>;
  logSession: (block: FocusBlock, kind: SegmentKind, durationMinutes: number) => Promise<void>;
  /** Logs a focus session that wasn't tracked live through a block/timer — e.g. offline
   *  focus time the user wants reflected in analytics. */
  logManualSession: (params: { category: string; durationMinutes: number; occurredAt: string; note?: string }) => Promise<boolean>;
  /** Resets a block fully back to its initial state: marks all segments incomplete in the DB
   *  and zeroes all runtime counters so it can be run again from scratch. */
  resetBlock: (id: string) => Promise<void>;

  /** Refetches a single block (with its segments + tasks) and merges it into state. */
  refetchBlockDetail: (blockId: string) => Promise<void>;
  /** Subscribes to Postgres changes on focus_blocks/tasks for this user so other
   *  signed-in devices see updates live instead of only on next page load.
   *  Returns an unsubscribe function. */
  subscribeRealtime: () => () => void;
}

/** Returns the queued blocks (queuePosition !== null), sorted by queue order. */
export function getQueuedBlocks(blocks: FocusBlock[]): FocusBlock[] {
  return blocks
    .filter((b) => b.queuePosition !== null)
    .sort((a, b) => a.queuePosition! - b.queuePosition!);
}

export const useBlocksStore = create<BlocksState>((set, get) => ({
  blocks: [],
  loading: false,
  error: null,

  fetchBlocks: async () => {
    set({ loading: true, error: null });
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      set({ loading: false, blocks: [] });
      return;
    }

    const [{ data: blockRows, error: blockErr }, { data: segmentRows }, { data: taskRows }] = await Promise.all([
      supabase.from("focus_blocks").select("*").order("created_at", { ascending: false }),
      supabase.from("block_segments").select("*"),
      supabase.from("tasks").select("*").order("position", { ascending: true }),
    ]);

    if (blockErr) {
      set({ loading: false, error: blockErr.message });
      return;
    }

    const now = Date.now();
    const blocks = (blockRows ?? []).map((row) => rowToBlock(row, segmentRows ?? [], taskRows ?? []));

    // On a fresh page load the timer store always starts paused.
    // Any block the DB still thinks is "active" must be reconciled to "paused"
    // so the dashboard doesn't misleadingly show "Open timer / active".
    // We also credit the wall-clock gap since lastStartedAt so progress is
    // accurate when the user hits Resume.
    const activeOnLoad = blocks.filter((b) => b.status === "active");
    const reconciled = blocks.map((b) => {
      if (b.status !== "active") return b;
      const gapSeconds = b.lastStartedAt
        ? Math.max(0, Math.floor((now - new Date(b.lastStartedAt).getTime()) / 1000))
        : 0;
      return {
        ...b,
        status: "paused" as const,
        elapsedSecondsInSegment: b.elapsedSecondsInSegment + gapSeconds,
        lastStartedAt: null,
      };
    });

    set({ blocks: reconciled, loading: false });

    // Persist the reconciled state back to Supabase (fire-and-forget).
    for (const b of activeOnLoad) {
      const patched = reconciled.find((r) => r.id === b.id);
      if (!patched) continue;
      recentLocalRuntimeWrites.set(b.id, now);
      supabase
        .from("focus_blocks")
        .update({
          status: "paused",
          elapsed_seconds_in_segment: patched.elapsedSecondsInSegment,
          last_started_at: null,
        })
        .eq("id", b.id);
    }
  },

  createBlock: async (draft) => {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      set({ error: "You must be signed in to create a focus block." });
      return null;
    }

    const { data: blockRow, error: blockErr } = await supabase
      .from("focus_blocks")
      .insert({
        user_id: user.id,
        name: draft.name,
        category: draft.category,
        total_minutes: draft.totalMinutes,
        focus_minutes: draft.focusMinutes,
        break_minutes: draft.breakMinutes,
        long_break_minutes: draft.longBreakMinutes,
        sessions_before_long_break: draft.sessionsBeforeLongBreak,
        strict_mode: draft.strictMode,
        ambient_youtube_url: draft.ambientYoutubeUrl,
        ambient_volume: draft.ambientVolume,
        status: "planned",
      })
      .select()
      .single();

    if (blockErr || !blockRow) {
      set({ error: blockErr?.message ?? "Failed to create block" });
      return null;
    }

    const plan = generateSessionPlan({
      totalMinutes: draft.totalMinutes,
      focusMinutes: draft.focusMinutes,
      breakMinutes: draft.breakMinutes,
      longBreakMinutes: draft.longBreakMinutes,
      sessionsBeforeLongBreak: draft.sessionsBeforeLongBreak,
    });

    const segmentInserts = plan.map((s) => ({
      block_id: blockRow.id,
      position: s.position,
      kind: s.kind,
      duration_minutes: s.durationMinutes,
    }));

    const taskInserts = draft.taskTitles
      .filter((t) => t.trim().length > 0)
      .map((title, i) => ({ block_id: blockRow.id, user_id: user.id, title: title.trim(), position: i }));

    const [{ data: segmentRows }, { data: taskRows }] = await Promise.all([
      segmentInserts.length
        ? supabase.from("block_segments").insert(segmentInserts).select()
        : Promise.resolve({ data: [] as SegmentRow[] }),
      taskInserts.length
        ? supabase.from("tasks").insert(taskInserts).select()
        : Promise.resolve({ data: [] as TaskRow[] }),
    ]);

    const newBlock = rowToBlock(blockRow, segmentRows ?? [], taskRows ?? []);
    set({ blocks: [newBlock, ...get().blocks] });
    return newBlock;
  },

  updateBlockMeta: async (id, patch) => {
    const payload: Partial<BlockRow> = {};
    if (patch.name !== undefined) payload.name = patch.name;
    if (patch.category !== undefined) payload.category = patch.category;
    if (patch.strictMode !== undefined) payload.strict_mode = patch.strictMode;
    if (patch.ambientYoutubeUrl !== undefined) payload.ambient_youtube_url = patch.ambientYoutubeUrl;
    if (patch.ambientVolume !== undefined) payload.ambient_volume = patch.ambientVolume;

    set({
      blocks: get().blocks.map((b) => (b.id === id ? { ...b, ...patch } as FocusBlock : b)),
    });

    // Mark this as our own write *before* any await below fires, so the
    // realtime echo of these updates (which lands a moment later) doesn't
    // race a `refetchBlockDetail` against the multi-step segment rewrite
    // further down and read the DB mid-transaction (segments deleted but
    // not yet reinserted) — see recentLocalRuntimeWrites' doc comment.
    recentLocalRuntimeWrites.set(id, Date.now());

    if (Object.keys(payload).length > 0) {
      await supabase.from("focus_blocks").update(payload).eq("id", id);
    }

    // If the ratio itself changed, regenerate the remaining (incomplete) timeline.
    const ratioChanged =
      patch.totalMinutes !== undefined ||
      patch.focusMinutes !== undefined ||
      patch.breakMinutes !== undefined ||
      patch.longBreakMinutes !== undefined ||
      patch.sessionsBeforeLongBreak !== undefined;

    if (ratioChanged) {
      const block = get().blocks.find((b) => b.id === id);
      if (!block) return;
      const updated = { ...block, ...patch } as FocusBlock;

      recentLocalRuntimeWrites.set(id, Date.now());
      await supabase
        .from("focus_blocks")
        .update({
          total_minutes: updated.totalMinutes,
          focus_minutes: updated.focusMinutes,
          break_minutes: updated.breakMinutes,
          long_break_minutes: updated.longBreakMinutes,
          sessions_before_long_break: updated.sessionsBeforeLongBreak,
        })
        .eq("id", id);

      const completed = block.segments.filter((s) => s.isCompleted);
      const remainingMinutes = Math.max(
        0,
        updated.totalMinutes - completed.reduce((sum, s) => sum + s.durationMinutes, 0)
      );
      const newPlan = generateSessionPlan({
        totalMinutes: remainingMinutes,
        focusMinutes: updated.focusMinutes,
        breakMinutes: updated.breakMinutes,
        longBreakMinutes: updated.longBreakMinutes,
        sessionsBeforeLongBreak: updated.sessionsBeforeLongBreak,
      }).map((s, i) => ({ ...s, position: completed.length + i }));

      recentLocalRuntimeWrites.set(id, Date.now());
      await supabase.from("block_segments").delete().eq("block_id", id).eq("is_completed", false);

      const freshRows = newPlan.length
        ? (
            await supabase
              .from("block_segments")
              .insert(newPlan.map((s) => ({ block_id: id, position: s.position, kind: s.kind, duration_minutes: s.durationMinutes })))
              .select()
          ).data
        : [];

      // Always land the final local state, even when the new plan is empty
      // (e.g. the shortened total time leaves no room for another segment)
      // — previously this `set` was skipped in that case, leaving the local
      // block pointing at segment rows that had just been deleted from the
      // DB until the next full refetch quietly "fixed" it.
      const completedRows = block.segments.filter((s) => s.isCompleted);
      recentLocalRuntimeWrites.set(id, Date.now());
      set({
        blocks: get().blocks.map((b) =>
          b.id === id
            ? {
                ...updated,
                segments: [...completedRows, ...(freshRows ?? []).map(rowToSegment)].sort(
                  (a, b2) => a.position - b2.position
                ),
              }
            : b
        ),
      });
    }
  },

  deleteBlock: async (id) => {
    set({ blocks: get().blocks.filter((b) => b.id !== id) });
    await supabase.from("focus_blocks").delete().eq("id", id);
  },

  setStatus: async (id, status) => {
    set({ blocks: get().blocks.map((b) => (b.id === id ? { ...b, status } : b)) });
    await supabase.from("focus_blocks").update({ status }).eq("id", id);
  },

  setQueue: async (orderedBlockIds) => {
    const nextPosition = new Map(orderedBlockIds.map((id, i) => [id, i]));
    const prevBlocks = get().blocks;

    set({
      blocks: prevBlocks.map((b) =>
        nextPosition.has(b.id)
          ? { ...b, queuePosition: nextPosition.get(b.id)! }
          : b.queuePosition !== null
          ? { ...b, queuePosition: null }
          : b
      ),
    });

    // Persist every id whose queuePosition actually changed (newly queued, reordered, or removed).
    const touchedIds = new Set([
      ...orderedBlockIds,
      ...prevBlocks.filter((b) => b.queuePosition !== null).map((b) => b.id),
    ]);
    await Promise.all(
      [...touchedIds].map((id) =>
        supabase
          .from("focus_blocks")
          .update({ queue_position: nextPosition.has(id) ? nextPosition.get(id)! : null })
          .eq("id", id)
      )
    );
  },

  addTask: async (blockId, title) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || !title.trim()) return;
    const block = get().blocks.find((b) => b.id === blockId);
    const position = block ? block.tasks.length : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({ block_id: blockId, user_id: userData.user.id, title: title.trim(), position })
      .select()
      .single();
    if (error || !data) return;

    set({
      blocks: get().blocks.map((b) => (b.id === blockId ? { ...b, tasks: [...b.tasks, rowToTask(data)] } : b)),
    });
  },

  toggleTask: async (taskId, isDone) => {
    set({
      blocks: get().blocks.map((b) => ({
        ...b,
        tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, isDone } : t)),
      })),
    });
    await supabase
      .from("tasks")
      .update({ is_done: isDone, completed_at: isDone ? new Date().toISOString() : null })
      .eq("id", taskId);
  },

  deleteTask: async (taskId) => {
    set({ blocks: get().blocks.map((b) => ({ ...b, tasks: b.tasks.filter((t) => t.id !== taskId) })) });
    await supabase.from("tasks").delete().eq("id", taskId);
  },

  rolloverTask: async (taskId, targetBlockId) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    let sourceTitle = "";
    const sourceBlock = get().blocks.find((b) => b.tasks.some((t) => t.id === taskId));
    const sourceTask = sourceBlock?.tasks.find((t) => t.id === taskId);
    if (!sourceTask) return;
    sourceTitle = sourceTask.title;

    const targetBlock = get().blocks.find((b) => b.id === targetBlockId);
    const position = targetBlock ? targetBlock.tasks.length : 0;

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        block_id: targetBlockId,
        user_id: userData.user.id,
        title: sourceTitle,
        position,
        rolled_over_from: taskId,
      })
      .select()
      .single();
    if (error || !data) return;

    set({
      blocks: get().blocks.map((b) =>
        b.id === targetBlockId ? { ...b, tasks: [...b.tasks, rowToTask(data)] } : b
      ),
    });
  },

  patchRuntimeLocal: (id, patch) => {
    set({ blocks: get().blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)) });
  },

  syncRuntime: async (id) => {
    const block = get().blocks.find((b) => b.id === id);
    if (!block) return;
    recentLocalRuntimeWrites.set(id, Date.now());
    await supabase
      .from("focus_blocks")
      .update({
        current_segment_index: block.currentSegmentIndex,
        elapsed_seconds_in_segment: block.elapsedSecondsInSegment,
        last_started_at: block.lastStartedAt,
        completed_minutes: block.completedMinutes,
        status: block.status,
      })
      .eq("id", id);
  },

  markSegmentComplete: async (blockId, segmentId) => {
    set({
      blocks: get().blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              segments: b.segments.map((s) =>
                s.id === segmentId ? { ...s, isCompleted: true, completedAt: new Date().toISOString() } : s
              ),
            }
          : b
      ),
    });
    await supabase
      .from("block_segments")
      .update({ is_completed: true, completed_at: new Date().toISOString() })
      .eq("id", segmentId);
  },

  logSession: async (block, kind, durationMinutes) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return;
    await supabase.from("focus_sessions").insert({
      user_id: userData.user.id,
      block_id: block.id,
      block_name: block.name,
      category: block.category,
      kind,
      duration_minutes: durationMinutes,
    });
  },

  logManualSession: async ({ category, durationMinutes, occurredAt, note }) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user || durationMinutes <= 0) return false;
    const { error } = await supabase.from("focus_sessions").insert({
      user_id: userData.user.id,
      block_id: null,
      block_name: note?.trim() || "Manual entry",
      category,
      kind: "focus",
      duration_minutes: Math.round(durationMinutes),
      occurred_at: occurredAt,
    });
    return !error;
  },

  resetBlock: async (id) => {
    // Optimistically reset local state immediately so the UI responds at once.
    set({
      blocks: get().blocks.map((b) =>
        b.id === id
          ? {
              ...b,
              status: "planned",
              currentSegmentIndex: 0,
              elapsedSecondsInSegment: 0,
              completedMinutes: 0,
              lastStartedAt: null,
              segments: b.segments.map((s) => ({
                ...s,
                isCompleted: false,
                completedAt: null,
              })),
            }
          : b
      ),
    });

    // Persist to DB in parallel: reset all segment flags + block runtime.
    await Promise.all([
      supabase
        .from("block_segments")
        .update({ is_completed: false, completed_at: null })
        .eq("block_id", id),
      supabase
        .from("focus_blocks")
        .update({
          status: "planned",
          current_segment_index: 0,
          elapsed_seconds_in_segment: 0,
          completed_minutes: 0,
          last_started_at: null,
        })
        .eq("id", id),
    ]);
  },

  refetchBlockDetail: async (blockId) => {
    const [{ data: blockRow }, { data: segmentRows }, { data: taskRows }] = await Promise.all([
      supabase.from("focus_blocks").select("*").eq("id", blockId).maybeSingle(),
      supabase.from("block_segments").select("*").eq("block_id", blockId),
      supabase.from("tasks").select("*").eq("block_id", blockId).order("position", { ascending: true }),
    ]);

    if (!blockRow) {
      // Block was deleted (or no longer visible under RLS) — drop it locally.
      set({ blocks: get().blocks.filter((b) => b.id !== blockId) });
      return;
    }

    const fresh = rowToBlock(blockRow, segmentRows ?? [], taskRows ?? []);
    const exists = get().blocks.some((b) => b.id === blockId);
    set({
      blocks: exists
        ? get().blocks.map((b) => (b.id === blockId ? fresh : b))
        : [fresh, ...get().blocks],
    });
  },

  subscribeRealtime: () => {
    let userId: string | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled || !data.user) return;
      userId = data.user.id;

      channel = supabase
        .channel(`flow-sync-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "focus_blocks", filter: `user_id=eq.${userId}` },
          (payload) => {
            const id = (payload.new as { id?: string } | null)?.id ?? (payload.old as { id?: string } | null)?.id;
            if (!id) return;
            const lastLocalWrite = recentLocalRuntimeWrites.get(id) ?? 0;
            if (Date.now() - lastLocalWrite < SELF_ECHO_WINDOW_MS) return; // our own tick sync, ignore
            get().refetchBlockDetail(id);
          }
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${userId}` },
          (payload) => {
            const blockId =
              (payload.new as { block_id?: string } | null)?.block_id ??
              (payload.old as { block_id?: string } | null)?.block_id;
            if (blockId) get().refetchBlockDetail(blockId);
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  },
}));
