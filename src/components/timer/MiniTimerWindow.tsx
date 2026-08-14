import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipForward } from "lucide-react";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useTimerStore, getLiveElapsedSeconds } from "@/store/useTimerStore";
import { formatClock } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { focus: "Focus", break: "Break", long_break: "Long break" };
const KIND_COLOR: Record<string, string> = { focus: "#F2A65A", break: "#6FD6C6", long_break: "#6FD6C6" };

/**
 * Content rendered inside the Document Picture-in-Picture window. Reads directly
 * from the timer/blocks stores (same JS context as the opener tab, no messaging
 * needed), so it stays correct even if the main tab is on a different app view.
 */
export function MiniTimerWindow() {
  const blocks = useBlocksStore((s) => s.blocks);
  const { activeBlockId, isRunning, pause, resume, skipSegment } = useTimerStore();
  const block = blocks.find((b) => b.id === activeBlockId) ?? null;
  const running = isRunning && Boolean(block);

  const [liveElapsed, setLiveElapsed] = useState(block?.elapsedSecondsInSegment ?? 0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || !block) {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      if (block) setLiveElapsed(block.elapsedSecondsInSegment);
      return;
    }
    const loop = () => {
      const live = getLiveElapsedSeconds();
      if (live !== null) setLiveElapsed(live);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [running, block]);

  if (!block) {
    return (
      <div className="flex h-full w-full items-center justify-center gap-2 bg-ink px-3 text-center">
        <span className="text-xs text-muted">No timer running — start a block in the Flow tab</span>
      </div>
    );
  }

  const currentSegment = block.segments[block.currentSegmentIndex];
  const segmentDurationSeconds = currentSegment ? currentSegment.durationMinutes * 60 : 0;
  const secondsRemaining = Math.max(0, segmentDurationSeconds - liveElapsed);
  const kind = currentSegment?.kind ?? "focus";

  return (
    <div className="flex h-full w-full items-center gap-2.5 bg-ink px-3">
      <span
        className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide"
        style={{ color: KIND_COLOR[kind], backgroundColor: `${KIND_COLOR[kind]}26` }}
      >
        {KIND_LABEL[kind] ?? kind}
      </span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium text-paper/80">{block.name}</span>
      <span className="shrink-0 font-mono text-xl font-medium tabular-nums text-paper">
        {formatClock(secondsRemaining)}
      </span>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => (running ? pause() : resume())}
          title={running ? "Pause" : "Resume"}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-focus/90 text-ink hover:bg-focus"
        >
          {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 translate-x-0.5" />}
        </button>
        <button
          onClick={() => skipSegment()}
          title="Skip segment"
          className="flex h-7 w-7 items-center justify-center rounded-full border border-glass-border bg-white/[0.03] text-paper/80 hover:bg-white/10"
        >
          <SkipForward className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
