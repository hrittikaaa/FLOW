import { useState } from "react";
import { CornerDownRight, Plus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useBlocksStore } from "@/store/useBlocksStore";
import type { FocusBlock } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TaskListProps {
  block: FocusBlock;
  otherBlocks: FocusBlock[];
  disabled?: boolean;
}

export function TaskList({ block, otherBlocks, disabled }: TaskListProps) {
  const { addTask, toggleTask, deleteTask, rolloverTask } = useBlocksStore();
  const [newTitle, setNewTitle] = useState("");
  const [rolloverOpenFor, setRolloverOpenFor] = useState<string | null>(null);

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addTask(block.id, newTitle);
    setNewTitle("");
  };

  return (
    <div className="space-y-2">
      <AnimatePresence initial={false}>
        {block.tasks.map((task) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="group"
          >
            <div className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-white/[0.03]">
              <button
                onClick={() => !disabled && toggleTask(task.id, !task.isDone)}
                disabled={disabled}
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                  task.isDone ? "border-focus bg-focus" : "border-white/25 hover:border-focus/60"
                )}
              >
                {task.isDone && <span className="h-1.5 w-1.5 rounded-sm bg-ink" />}
              </button>
              <span
                className={cn(
                  "flex-1 text-sm",
                  task.isDone ? "text-muted line-through" : "text-paper/90"
                )}
              >
                {task.title}
              </span>
              {!disabled && (
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  {otherBlocks.length > 0 && !task.isDone && (
                    <button
                      title="Push to another block"
                      onClick={() => setRolloverOpenFor(rolloverOpenFor === task.id ? null : task.id)}
                      className="rounded p-1 text-muted hover:bg-white/10 hover:text-rest"
                    >
                      <CornerDownRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    title="Delete task"
                    onClick={() => deleteTask(task.id)}
                    className="rounded p-1 text-muted hover:bg-white/10 hover:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
            {rolloverOpenFor === task.id && (
              <div className="ml-6 mt-1 flex flex-wrap gap-1.5 pb-1">
                {otherBlocks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      rolloverTask(task.id, b.id);
                      setRolloverOpenFor(null);
                    }}
                    className="rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 text-xs text-paper/80 backdrop-blur-sm hover:border-rest/50 hover:text-rest"
                  >
                    → {b.name}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>

      {!disabled && (
        <div className="flex items-center gap-2 pt-1">
          <Plus className="h-4 w-4 shrink-0 text-muted" />
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="Add a goal for this block…"
            className="h-8 border-0 bg-transparent px-1 focus-visible:ring-0"
          />
        </div>
      )}
    </div>
  );
}
