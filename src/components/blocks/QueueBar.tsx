import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Coffee, GripVertical, ListChecks, Plus, X } from "lucide-react";
import { useQueueStore } from "@/store/useQueueStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { projectQueueFinish } from "@/lib/queue";
import { formatMinutesAsHours, formatTimeOfDay } from "@/lib/utils";

/** Sticky summary + editor for the user's queue: drag to reorder, insert breaks
 *  between blocks, and see the combined remaining time and a projected finish. */
export function QueueBar() {
  const { items, fetchQueue, removeAt, addBreak, updateBreakMinutes, reorder, clear } = useQueueStore();
  const blocks = useBlocksStore((s) => s.blocks);
  const blocksById = new Map(blocks.map((b) => [b.id, b]));

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  useEffect(() => {
    fetchQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (items.length === 0) return null;

  const { totalMinutes, finishAt } = projectQueueFinish(items, blocksById);

  function handleDragStart(index: number) {
    draggedIndexRef.current = index;
    setDraggedIndex(index);
  }
  function handleDragEnd() {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
  }
  function handleDragEnter(hoverIndex: number) {
    const from = draggedIndexRef.current;
    if (from === null || from === hoverIndex) return;
    reorder(from, hoverIndex);
    draggedIndexRef.current = hoverIndex;
    setDraggedIndex(hoverIndex);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="glass-panel space-y-3 px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2 text-sm text-paper">
          <ListChecks className="h-4 w-4 text-focus shrink-0" />
          <span className="font-medium">
            {items.filter((i) => i.kind === "block").length} block{items.filter((i) => i.kind === "block").length === 1 ? "" : "s"} queued
          </span>
        </div>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="tabular text-paper/90">{formatMinutesAsHours(totalMinutes)} total</span>
          <span className="tabular text-focus">Finishes ~{formatTimeOfDay(finishAt)}</span>
          <button
            onClick={() => clear()}
            className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted transition-colors hover:bg-white/10 hover:text-paper"
          >
            <X className="h-3 w-3" /> Clear
          </button>
        </div>
      </div>

      {/* Drag-reorderable queue items, with an insert-break affordance in each gap */}
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isDragging = draggedIndex === index;
          return (
            <div key={item.id} className="flex items-center gap-1.5">
              {item.kind === "block" ? (
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    handleDragEnter(index);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  className={`flex items-center gap-1 rounded-full bg-white/[0.06] py-0.5 pl-1.5 pr-2 text-xs text-paper/90 transition-opacity ${
                    isDragging ? "opacity-40" : ""
                  }`}
                >
                  <GripVertical className="h-3 w-3 shrink-0 text-muted" />
                  <span className="max-w-[10rem] truncate">
                    {index + 1}. {blocksById.get(item.blockId)?.name ?? "Deleted block"}
                  </span>
                  <button
                    onClick={() => removeAt(index)}
                    title="Remove from queue"
                    className="ml-0.5 rounded-full p-0.5 text-muted hover:bg-white/10 hover:text-paper"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ) : (
                <div
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragEnd={handleDragEnd}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    handleDragEnter(index);
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  className={`flex items-center gap-1 rounded-full bg-rest/10 py-0.5 pl-1.5 pr-2 text-xs text-rest transition-opacity ${
                    isDragging ? "opacity-40" : ""
                  }`}
                >
                  <Coffee className="h-3 w-3 shrink-0" />
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={item.minutes}
                    onChange={(e) => updateBreakMinutes(item.id, Number(e.target.value) || 1)}
                    className="w-8 border-none bg-transparent text-right tabular-nums text-rest focus-visible:outline-none"
                  />
                  <span>m break</span>
                  <button
                    onClick={() => removeAt(index)}
                    title="Remove break"
                    className="ml-0.5 rounded-full p-0.5 text-rest/70 hover:bg-white/10 hover:text-rest"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              )}

              {/* Insert-break affordance in the gap after this item */}
              <button
                onClick={() => addBreak(index)}
                title="Insert a break here"
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-muted/50 transition-colors hover:bg-white/10 hover:text-focus"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
