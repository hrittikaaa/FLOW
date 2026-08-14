import type { FocusBlock, QueueItem } from "@/types";

/** Minutes left to run in this block, crediting live progress in the current segment. */
export function remainingMinutesForBlock(block: FocusBlock): number {
  const done = block.completedMinutes + Math.floor(block.elapsedSecondsInSegment / 60);
  return Math.max(0, block.totalMinutes - done);
}

export interface QueueProjection {
  totalMinutes: number;
  finishAt: Date;
}

/** Projects when an ordered queue (blocks + manual breaks) would finish if run back-to-back starting now. */
export function projectQueueFinish(
  items: QueueItem[],
  blocksById: Map<string, FocusBlock>,
  startAt: Date = new Date()
): QueueProjection {
  const totalMinutes = items.reduce((sum, item) => {
    if (item.kind === "break") return sum + item.minutes;
    const block = blocksById.get(item.blockId);
    return sum + (block ? remainingMinutesForBlock(block) : 0);
  }, 0);
  return { totalMinutes, finishAt: new Date(startAt.getTime() + totalMinutes * 60_000) };
}
