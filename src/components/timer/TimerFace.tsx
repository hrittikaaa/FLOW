import { AnimatePresence, motion } from "framer-motion";
import { formatClock } from "@/lib/utils";
import type { SegmentKind } from "@/types";

interface TimerFaceProps {
  kind: SegmentKind | null;
  secondsRemaining: number;
  segmentLabel: string; // e.g. "Segment 3 of 8"
  blockName: string;
}

const kindLabel: Record<SegmentKind, string> = {
  focus: "Focus",
  break: "Short break",
  long_break: "Long break",
};

const kindColor: Record<SegmentKind, string> = {
  focus: "text-focus",
  break: "text-rest",
  long_break: "text-rest",
};

export function TimerFace({ kind, secondsRemaining, segmentLabel, blockName }: TimerFaceProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <AnimatePresence mode="wait">
        <motion.div
          key={kind ?? "idle"}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center"
        >
          <span className={`font-mono text-xs uppercase tracking-[0.25em] ${kind ? kindColor[kind] : "text-muted"}`}>
            {kind ? kindLabel[kind] : "Ready"}
          </span>
          <span className="tabular mt-2 font-display text-6xl font-semibold text-paper sm:text-7xl">
            {formatClock(secondsRemaining)}
          </span>
          <span className="mt-3 max-w-[220px] truncate text-sm text-muted">{blockName}</span>
          <span className="mt-1 font-mono text-[11px] text-muted/70">{segmentLabel}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
