import { motion } from "framer-motion";
import { ListChecks, X } from "lucide-react";
import { useBlocksStore, getQueuedBlocks } from "@/store/useBlocksStore";
import { projectQueueFinish } from "@/lib/queue";
import { formatMinutesAsHours, formatTimeOfDay } from "@/lib/utils";
import type { FocusBlock } from "@/types";

interface QueueBarProps {
  blocks: FocusBlock[];
}

/** Sticky summary of the user's queued blocks: count, total remaining time, and a projected finish clock-time. */
export function QueueBar({ blocks }: QueueBarProps) {
  const setQueue = useBlocksStore((s) => s.setQueue);
  const queued = getQueuedBlocks(blocks);

  if (queued.length === 0) return null;

  const { totalMinutes, finishAt } = projectQueueFinish(queued);

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-panel flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3"
    >
      <div className="flex items-center gap-2 text-sm text-paper">
        <ListChecks className="h-4 w-4 text-focus shrink-0" />
        <span className="font-medium">
          {queued.length} block{queued.length === 1 ? "" : "s"} queued
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
        {queued.map((b, i) => (
          <span key={b.id} className="rounded-full bg-white/[0.06] px-2 py-0.5">
            {i + 1}. {b.name}
          </span>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-4 text-sm">
        <span className="tabular text-paper/90">{formatMinutesAsHours(totalMinutes)} total</span>
        <span className="tabular text-focus">Finishes ~{formatTimeOfDay(finishAt)}</span>
        <button
          onClick={() => setQueue([])}
          className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-white/10 hover:text-paper"
        >
          <X className="h-3 w-3" /> Clear
        </button>
      </div>
    </motion.div>
  );
}
