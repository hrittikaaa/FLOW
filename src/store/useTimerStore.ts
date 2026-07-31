import { create } from "zustand";
import { useBlocksStore } from "@/store/useBlocksStore";

let intervalId: ReturnType<typeof setInterval> | null = null;
let ticksSinceSync = 0;
const SYNC_EVERY_N_TICKS = 5;

/**
 * Wall-clock anchor for the currently running block: `baselineSeconds` is
 * the elapsed-in-segment value at the moment this anchor was set, and
 * `anchoredAtMs` is the Date.now() at that same moment. Real elapsed time
 * is always recomputed as `baselineSeconds + (Date.now() - anchoredAtMs)`,
 * never by counting how many times setInterval happened to fire.
 *
 * This matters because browsers throttle timers in background/hidden tabs
 * (Chrome can drop a 1s interval to roughly once a minute once a tab has
 * been hidden for a while). A tick-counting implementation would silently
 * undercount real time; this wall-clock version self-corrects on whatever
 * tick eventually does fire, and a visibilitychange listener below forces
 * an immediate catch-up the moment the tab regains focus.
 */
let anchor: { baselineSeconds: number; anchoredAtMs: number } | null = null;

function clearTick() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  anchor = null;
}

function setAnchor(baselineSeconds: number) {
  anchor = { baselineSeconds, anchoredAtMs: Date.now() };
}

/** Marks the current segment complete, logs it, and advances the pointer — without syncing (caller batches the sync). */
function completeCurrentSegment(blockId: string): boolean {
  const blocksApi = useBlocksStore.getState();
  const block = blocksApi.blocks.find((b) => b.id === blockId);
  if (!block) return true;

  const currentSegment = block.segments[block.currentSegmentIndex];
  if (currentSegment) {
    blocksApi.markSegmentComplete(blockId, currentSegment.id);
    blocksApi.logSession(block, currentSegment.kind, currentSegment.durationMinutes);
  }

  const nextIndex = block.currentSegmentIndex + 1;
  const isFinished = nextIndex >= block.segments.length;
  const completedMinutes = block.completedMinutes + (currentSegment?.durationMinutes ?? 0);

  blocksApi.patchRuntimeLocal(blockId, {
    currentSegmentIndex: nextIndex,
    completedMinutes,
    status: isFinished ? "completed" : "active",
  });

  return isFinished;
}

/** Manual skip (button press) — advances exactly one segment and syncs immediately. */
function advanceSegment(blockId: string) {
  const isFinished = completeCurrentSegment(blockId);
  const blocksApi = useBlocksStore.getState();

  if (isFinished) {
    blocksApi.patchRuntimeLocal(blockId, { elapsedSecondsInSegment: 0, lastStartedAt: null });
    blocksApi.syncRuntime(blockId);
    clearTick();
    useTimerStore.setState({ isRunning: false, activeBlockId: null, isStrictLocked: false });
    return;
  }

  blocksApi.patchRuntimeLocal(blockId, { elapsedSecondsInSegment: 0, lastStartedAt: new Date().toISOString() });
  blocksApi.syncRuntime(blockId);
  setAnchor(0);
}

function tick(blockId: string) {
  if (!anchor) return;
  const blocksApi = useBlocksStore.getState();
  let block = blocksApi.blocks.find((b) => b.id === blockId);
  if (!block) return;

  // Real elapsed seconds since the anchor was set, regardless of how many
  // (or how few) interval callbacks actually fired in between.
  let remaining = anchor.baselineSeconds + Math.floor((Date.now() - anchor.anchoredAtMs) / 1000);

  // Walk forward through however many segments that time span covers —
  // handles the case where the tab was backgrounded through an entire
  // focus segment, a break, or more.
  while (true) {
    const currentSegment = block!.segments[block!.currentSegmentIndex];
    if (!currentSegment) {
      clearTick();
      useTimerStore.setState({ isRunning: false, activeBlockId: null, isStrictLocked: false });
      return;
    }

    const durationSeconds = currentSegment.durationMinutes * 60;
    if (remaining < durationSeconds) {
      blocksApi.patchRuntimeLocal(blockId, { elapsedSecondsInSegment: remaining });
      break;
    }

    remaining -= durationSeconds;
    const isFinished = completeCurrentSegment(blockId);
    block = useBlocksStore.getState().blocks.find((b) => b.id === blockId);

    if (isFinished || !block) {
      useBlocksStore.getState().patchRuntimeLocal(blockId, { elapsedSecondsInSegment: 0, lastStartedAt: null });
      useBlocksStore.getState().syncRuntime(blockId);
      clearTick();
      useTimerStore.setState({ isRunning: false, activeBlockId: null, isStrictLocked: false });
      return;
    }
  }

  // Re-anchor to "now" so future ticks measure from a fresh, precise point.
  setAnchor(remaining);

  ticksSinceSync += 1;
  if (ticksSinceSync >= SYNC_EVERY_N_TICKS) {
    ticksSinceSync = 0;
    blocksApi.syncRuntime(blockId);
  }
}

// Force an immediate catch-up the moment the tab regains focus, instead of
// waiting for the browser to eventually fire the next throttled interval.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible") return;
    const { activeBlockId, isRunning } = useTimerStore.getState();
    if (isRunning && activeBlockId) tick(activeBlockId);
  });
}

interface TimerState {
  activeBlockId: string | null;
  isRunning: boolean;
  isStrictLocked: boolean;

  start: (blockId: string) => void;
  pause: () => void;
  resume: () => void;
  skipSegment: () => void;
  stopAndReset: (blockId: string) => void;
}

export const useTimerStore = create<TimerState>((set, get) => ({
  activeBlockId: null,
  isRunning: false,
  isStrictLocked: false,

  start: (blockId) => {
    clearTick();
    const blocksApi = useBlocksStore.getState();
    const block = blocksApi.blocks.find((b) => b.id === blockId);
    if (!block) return;

    blocksApi.patchRuntimeLocal(blockId, {
      status: "active",
      lastStartedAt: new Date().toISOString(),
    });
    blocksApi.syncRuntime(blockId);

    set({ activeBlockId: blockId, isRunning: true, isStrictLocked: block.strictMode });
    setAnchor(block.elapsedSecondsInSegment);
    intervalId = setInterval(() => tick(blockId), 1000);
  },

  pause: () => {
    const { activeBlockId } = get();
    if (!activeBlockId) return;
    // Flush the anchor's real elapsed time into state before stopping the clock.
    // This can itself complete the block if enough real time passed while backgrounded.
    tick(activeBlockId);
    clearTick();
    if (get().activeBlockId !== activeBlockId) return; // tick already finished/cleared it
    const blocksApi = useBlocksStore.getState();
    blocksApi.patchRuntimeLocal(activeBlockId, { status: "paused", lastStartedAt: null });
    blocksApi.syncRuntime(activeBlockId);
    set({ isRunning: false, isStrictLocked: false });
  },

  resume: () => {
    const { activeBlockId } = get();
    if (!activeBlockId) return;
    clearTick();
    const blocksApi = useBlocksStore.getState();
    const block = blocksApi.blocks.find((b) => b.id === activeBlockId);
    blocksApi.patchRuntimeLocal(activeBlockId, { status: "active", lastStartedAt: new Date().toISOString() });
    blocksApi.syncRuntime(activeBlockId);
    set({ isRunning: true, isStrictLocked: block?.strictMode ?? false });
    setAnchor(block?.elapsedSecondsInSegment ?? 0);
    intervalId = setInterval(() => tick(activeBlockId), 1000);
  },

  skipSegment: () => {
    const { activeBlockId } = get();
    if (!activeBlockId) return;
    advanceSegment(activeBlockId);
  },

  stopAndReset: (blockId) => {
    clearTick();
    const blocksApi = useBlocksStore.getState();
    blocksApi.patchRuntimeLocal(blockId, {
      status: "planned",
      currentSegmentIndex: 0,
      elapsedSecondsInSegment: 0,
      lastStartedAt: null,
      completedMinutes: 0,
    });
    blocksApi.syncRuntime(blockId);
    set({ activeBlockId: null, isRunning: false, isStrictLocked: false });
  },
}));