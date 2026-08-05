import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, ListChecks, X } from "lucide-react";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useTimerStore, getLiveElapsedSeconds } from "@/store/useTimerStore";
import { useStrictModeGuard } from "@/hooks/useStrictModeGuard";
import { BlockRing } from "@/components/timer/BlockRing";
import { TimerFace } from "@/components/timer/TimerFace";
import { TimerControls } from "@/components/timer/TimerControls";
import { TimelineStrip } from "@/components/timer/TimelineStrip";
import { AmbientSoundPlayer } from "@/components/timer/AmbientSoundPlayer";
import { TaskList } from "@/components/blocks/TaskList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TimerViewProps {
  blockId: string | null;
  onPickBlock: () => void;
  /** Name of a block that was auto-paused to make way for this one. */
  pausedBlockName?: string | null;
  onDismissPausedWarning?: () => void;
}

export function TimerView({ blockId, onPickBlock, pausedBlockName, onDismissPausedWarning }: TimerViewProps) {
  const blocks = useBlocksStore((s) => s.blocks);
  const { activeBlockId, isRunning, start, pause, resume, skipSegment, stopAndReset, restartSegment, restartBlock } = useTimerStore();

  const block = useMemo(() => blocks.find((b) => b.id === blockId) ?? null, [blocks, blockId]);
  const running = isRunning && activeBlockId === blockId;

  const { strayed, clearStrayed } = useStrictModeGuard(running && Boolean(block?.strictMode));

  // Auto-dismiss the "paused" warning after 6 s
  useEffect(() => {
    if (!pausedBlockName) return;
    const t = setTimeout(() => onDismissPausedWarning?.(), 6000);
    return () => clearTimeout(t);
  }, [pausedBlockName, onDismissPausedWarning]);

  if (!block) {
    return (
      <div className="glass-panel flex flex-col items-center gap-3 px-6 py-16 text-center">
        <p className="font-display text-lg text-paper">No block selected</p>
        <p className="max-w-xs text-sm text-muted">Pick a focus block from your dashboard to start the timer.</p>
        <Button onClick={onPickBlock}>Browse blocks</Button>
      </div>
    );
  }

  const currentSegment = block.segments[block.currentSegmentIndex];
  const segmentDurationSeconds = currentSegment ? currentSegment.durationMinutes * 60 : 0;

  // Live countdown: use a rAF loop to read directly from the wall-clock anchor
  // so the display is smooth and never depends on when the 1 s interval fires.
  const [liveElapsed, setLiveElapsed] = useState<number>(
    block.elapsedSecondsInSegment
  );
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) {
      // Paused / stopped — cancel any live loop and show the persisted state.
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setLiveElapsed(block.elapsedSecondsInSegment);
      return;
    }

    // Running: continuously read the wall-clock anchor.
    const loop = () => {
      const live = getLiveElapsedSeconds();
      if (live !== null) setLiveElapsed(live);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [running, block.elapsedSecondsInSegment]);

  const secondsRemaining = Math.max(0, segmentDurationSeconds - liveElapsed);
  const isComplete = block.status === "completed";

  const handlePlayPause = () => {
    if (activeBlockId && activeBlockId !== block.id) {
      pause();
    }
    if (activeBlockId === block.id) {
      isRunning ? pause() : resume();
    } else {
      start(block.id);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <Card className="flex flex-col items-center gap-6 p-8">
        <AmbientSoundPlayer sound={block.ambientSound} kind={running ? currentSegment?.kind ?? null : null} />

        {/* Auto-paused warning — shown when this block replaced another running one */}
        <AnimatePresence>
          {pausedBlockName && (
            <motion.div
              key="paused-warning"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="flex w-full items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300 backdrop-blur-sm"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
              <span className="flex-1">
                <span className="font-medium text-amber-200">"{pausedBlockName}"</span> is paused — you can resume it again from the Blocks tab.
              </span>
              <button
                onClick={onDismissPausedWarning}
                className="shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {block.strictMode && block.status === "active" && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-focus/30 bg-focus/10 px-3 py-2 text-xs text-focus backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Strict mode — skip/restart locked, segments auto-start, and you'll be warned before closing this tab.</span>
          </div>
        )}

        {strayed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger backdrop-blur-sm"
          >
            Welcome back — your focus block is still running.{" "}
            <button onClick={clearStrayed} className="underline underline-offset-2">
              Dismiss
            </button>
          </motion.div>
        )}

        <div className="relative flex items-center justify-center" style={{ width: 340, height: 340 }}>
          <BlockRing
            segments={block.segments}
            currentIndex={block.currentSegmentIndex}
            elapsedSeconds={block.elapsedSecondsInSegment}
          />
          {isComplete ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center gap-3">
              <span className="font-display text-3xl font-semibold text-focus">Complete</span>
              <span className="mt-1 text-sm text-muted">{block.name}</span>
              <button
                onClick={() => restartBlock(block.id)}
                className="mt-2 flex items-center gap-1.5 rounded-full border border-glass-border bg-white/5 px-4 py-1.5 text-xs text-paper/80 backdrop-blur-sm hover:bg-white/10 hover:text-paper transition-colors"
              >
                <span>↺</span> Restart block
              </button>
            </div>
          ) : (
            <TimerFace
              kind={currentSegment?.kind ?? null}
              secondsRemaining={secondsRemaining}
              segmentLabel={`Segment ${block.currentSegmentIndex + 1} of ${block.segments.length}`}
              blockName={block.name}
            />
          )}
        </div>

        {!isComplete && (
          <TimerControls
            isRunning={running}
            hasActiveBlock={Boolean(block)}
            onPlayPause={handlePlayPause}
            onSkip={skipSegment}
            onStop={() => stopAndReset(block.id)}
            onRestartSegment={restartSegment}
            onRestartBlock={() => restartBlock(block.id)}
            disabled={block.strictMode && block.status === "active"}
          />
        )}

        <div className="w-full border-t border-glass-border pt-5">
          <TimelineStrip
            segments={block.segments
              .filter((s) => !s.isCompleted)
              .map((s) => ({ position: s.position, kind: s.kind, durationMinutes: s.durationMinutes }))}
            startAt={new Date(Date.now() - block.elapsedSecondsInSegment * 1000)}
            compact
          />
        </div>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ListChecks className="h-4 w-4 text-focus" /> Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TaskList
            block={block}
            otherBlocks={blocks.filter((b) => b.id !== block.id)}
            disabled={block.strictMode && running}
          />
        </CardContent>
      </Card>
    </div>
  );
}
