import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, ListChecks, Pencil, PictureInPicture2 } from "lucide-react";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useTimerStore, getLiveElapsedSeconds } from "@/store/useTimerStore";
import { usePipStore, isPipSupported } from "@/store/usePipStore";
import { useStrictModeGuard } from "@/hooks/useStrictModeGuard";
import { BlockRing } from "@/components/timer/BlockRing";
import { TimerFace } from "@/components/timer/TimerFace";
import { TimerControls } from "@/components/timer/TimerControls";
import { TimelineStrip } from "@/components/timer/TimelineStrip";
import { AmbientYoutubePlayer } from "@/components/timer/AmbientYoutubePlayer";
import { AmbientPlayerControls } from "@/components/timer/AmbientPlayerControls";
import { TaskList } from "@/components/blocks/TaskList";
import { BlockFormDialog } from "@/components/blocks/BlockFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface TimerViewProps {
  blockId: string | null;
  onPickBlock: () => void;
}

export function TimerView({ blockId, onPickBlock }: TimerViewProps) {
  const blocks = useBlocksStore((s) => s.blocks);
  const { activeBlockId, isRunning, start, pause, resume, skipSegment, stopAndReset, restartSegment, restartBlock } = useTimerStore();

  const block = useMemo(() => blocks.find((b) => b.id === blockId) ?? null, [blocks, blockId]);
  const running = isRunning && activeBlockId === blockId;

  const { strayed, clearStrayed } = useStrictModeGuard(running && Boolean(block?.strictMode));
  const [editOpen, setEditOpen] = useState(false);
  const { pipWindow, open: openPip, close: closePip } = usePipStore();

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
      <Card className="relative flex flex-col items-center gap-6 p-8">
        <AmbientYoutubePlayer
          url={block.ambientYoutubeUrl}
          volume={block.ambientVolume}
          kind={running ? currentSegment?.kind ?? null : null}
        />

        <div className="absolute right-5 top-5 flex items-center gap-2">
          {isPipSupported() && (
            <button
              id="timer-pip-btn"
              onClick={() => (pipWindow ? closePip() : openPip())}
              title={pipWindow ? "Close pop-out timer" : "Pop out timer"}
              className={`flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                pipWindow
                  ? "border-focus/50 bg-focus/25 text-focus shadow-[0_0_12px_-2px_rgba(242,166,90,0.7)]"
                  : "border-focus/40 bg-focus/10 text-focus shadow-[0_0_10px_-4px_rgba(242,166,90,0.6)] hover:bg-focus/20"
              }`}
            >
              <PictureInPicture2 size={14} />
            </button>
          )}
          <button
            id="timer-edit-block-btn"
            onClick={() => setEditOpen(true)}
            title="Edit this block"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-glass-border bg-white/[0.03] text-muted transition-colors hover:bg-white/10 hover:text-paper"
          >
            <Pencil size={14} />
          </button>
        </div>

        {block.strictMode && block.status === "active" && (
          <div className="flex w-full items-center gap-2 rounded-lg border border-focus/30 bg-focus/10 px-3 py-2 text-xs text-focus backdrop-blur-sm">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>Strict mode is on. Skip/restart are locked, segments auto-start, and you'll get a warning if you close this tab.</span>
          </div>
        )}

        {strayed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger backdrop-blur-sm"
          >
            Welcome back! Your focus block is still running.{" "}
            <button onClick={clearStrayed} className="underline underline-offset-2">
              Got it
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

      <div className="flex flex-col gap-4 lg:col-start-2">
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

        {block.ambientYoutubeUrl && <AmbientPlayerControls />}
      </div>

      <BlockFormDialog open={editOpen} onOpenChange={setEditOpen} existingBlock={block} allBlocks={blocks} />
    </div>
  );
}
