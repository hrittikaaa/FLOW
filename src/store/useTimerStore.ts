import { create } from "zustand";
import { useBlocksStore } from "@/store/useBlocksStore";
import { fireNotification } from "@/hooks/useNotifications";
import { playChime } from "@/lib/notificationSound";

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

/**
 * Returns the live elapsed seconds in the current segment by reading the
 * wall clock directly from the anchor — never stale, no tick jitter.
 * Returns null when the timer is not running.
 */
export function getLiveElapsedSeconds(): number | null {
  if (!anchor) return null;
  return anchor.baselineSeconds + (Date.now() - anchor.anchoredAtMs) / 1000;
}

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


/** Marks the current segment complete, logs it, advances the pointer, and fires a notification + chime. */
function completeCurrentSegment(blockId: string): boolean {
  const blocksApi = useBlocksStore.getState();
  // Capture the segment info we need BEFORE any mutations.
  const block = blocksApi.blocks.find((b) => b.id === blockId);
  if (!block) return true;

  const currentSegmentIndex = block.currentSegmentIndex;
  const currentSegment = block.segments[currentSegmentIndex];
  const totalSegments = block.segments.length;

  if (currentSegment) {
    blocksApi.markSegmentComplete(blockId, currentSegment.id);
    blocksApi.logSession(block, currentSegment.kind, currentSegment.durationMinutes);
  }

  const nextIndex = currentSegmentIndex + 1;
  const isFinished = nextIndex >= totalSegments;
  // Re-read completedMinutes from store after markSegmentComplete may have touched state.
  const freshBlock = useBlocksStore.getState().blocks.find((b) => b.id === blockId);
  const completedMinutes = (freshBlock?.completedMinutes ?? block.completedMinutes) + (currentSegment?.durationMinutes ?? 0);

  blocksApi.patchRuntimeLocal(blockId, {
    currentSegmentIndex: nextIndex,
    completedMinutes,
    status: isFinished ? "completed" : "active",
  });

  // Fire notification + chime based on what just completed
  if (isFinished) {
    playChime("completed");
    fireNotification(`✅ "${block.name}" complete!`, {
      body: `Great work! You finished all ${block.totalMinutes} minutes.`,
      tag: `pf-block-${blockId}`,
    });
  } else if (currentSegment) {
    const nextSegment = block.segments[nextIndex];
    if (nextSegment) {
      if (nextSegment.kind === "focus") {
        // Break segment done → focus starts
        playChime("break");
        fireNotification("☕ Break over — time to focus!", {
          body: `Next up: ${nextSegment.durationMinutes} min focus session in "${block.name}".`,
          tag: `pf-segment-${blockId}`,
        });
      } else {
        // Focus segment done → break starts
        playChime("focus");
        fireNotification("🎉 Focus session done!", {
          body: `Take a ${nextSegment.durationMinutes} min ${nextSegment.kind === "long_break" ? "long break" : "break"} — you've earned it.`,
          tag: `pf-segment-${blockId}`,
        });
      }
    }
  }

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

    // Re-anchor to the overflow time so the next tick doesn't re-compute
    // the same large elapsed and immediately complete the new segment too.
    setAnchor(remaining);
  }

  // Write elapsed into state (for Supabase sync + resuming after page reload)
  // but do NOT re-anchor here — the anchor keeps accumulating from its original
  // start point, which gives sub-second precision on the live display.
  // Only re-anchor when crossing a segment boundary (done above via setAnchor(0)
  // inside completeCurrentSegment's caller path) or on resume.

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
  /** Resets elapsed time of the current segment to zero and re-anchors the clock. */
  restartSegment: () => void;
  /** Fully resets the block (all segments + runtime) back to its initial state. */
  restartBlock: (blockId: string) => void;
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

  restartSegment: () => {
    const { activeBlockId, isRunning } = get();
    if (!activeBlockId) return;
    const blocksApi = useBlocksStore.getState();
    // Reset elapsed time in local state and re-anchor the wall clock.
    blocksApi.patchRuntimeLocal(activeBlockId, { elapsedSecondsInSegment: 0 });
    if (isRunning) {
      setAnchor(0);
    }
    blocksApi.syncRuntime(activeBlockId);
  },

  restartBlock: (blockId) => {
    clearTick();
    set({ activeBlockId: null, isRunning: false, isStrictLocked: false });
    // resetBlock handles both local state and DB persistence.
    useBlocksStore.getState().resetBlock(blockId);
  },
}));