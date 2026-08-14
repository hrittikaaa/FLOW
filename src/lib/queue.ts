import type { FocusBlock } from "@/types";

/** Minutes left to run in this block, crediting live progress in the current segment. */
export function remainingMinutesForBlock(block: FocusBlock): number {
  const done = block.completedMinutes + Math.floor(block.elapsedSecondsInSegment / 60);
  return Math.max(0, block.totalMinutes - done);
}

export interface QueueProjection {
  totalMinutes: number;
  finishAt: Date;
}

/** Projects when an ordered list of blocks would finish if run back-to-back starting now. */
export function projectQueueFinish(blocks: FocusBlock[], startAt: Date = new Date()): QueueProjection {
  const totalMinutes = blocks.reduce((sum, b) => sum + remainingMinutesForBlock(b), 0);
  return { totalMinutes, finishAt: new Date(startAt.getTime() + totalMinutes * 60_000) };
}
