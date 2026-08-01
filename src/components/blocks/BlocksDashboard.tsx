import { useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useBlocksStore } from "@/store/useBlocksStore";
import { BlockCard } from "@/components/blocks/BlockCard";
import { BlockFormDialog } from "@/components/blocks/BlockFormDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FocusBlock } from "@/types";

interface BlocksDashboardProps {
  onSelectBlock: (block: FocusBlock) => void;
}

type FilterTab = "all" | "active" | "planned" | "completed";

export function BlocksDashboard({ onSelectBlock }: BlocksDashboardProps) {
  const { blocks, deleteBlock, resetBlock } = useBlocksStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FocusBlock | undefined>(undefined);
  const [tab, setTab] = useState<FilterTab>("all");
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const baseFiltered = useMemo(() => {
    if (tab === "all") return blocks.filter((b) => b.status !== "archived");
    if (tab === "completed") return blocks.filter((b) => b.status === "completed");
    return blocks.filter((b) => b.status === tab);
  }, [blocks, tab]);

  // Local ordered list — keeps the user's drag order in-session; resets when
  // the underlying filtered set changes (new block created, tab switch, etc.).
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const baseIds = baseFiltered.map((b) => b.id).join(",");
  const [prevBaseIds, setPrevBaseIds] = useState<string>("");
  if (baseIds !== prevBaseIds) {
    setPrevBaseIds(baseIds);
    setOrderedIds(baseFiltered.map((b) => b.id));
  }

  // Derive the rendered block list from orderedIds
  const filtered = useMemo(() => {
    const map = new Map(baseFiltered.map((b) => [b.id, b]));
    return orderedIds.flatMap((id) => {
      const b = map.get(id);
      return b ? [b] : [];
    });
  }, [orderedIds, baseFiltered]);

  // ref so drag enter handlers can read the current dragged id without stale closure
  const draggedIdRef = useRef<string | null>(null);

  function handleDragStart(id: string) {
    draggedIdRef.current = id;
    setDraggedId(id);
  }

  function handleDragEnd() {
    draggedIdRef.current = null;
    setDraggedId(null);
  }

  function handleDragEnter(hoverId: string) {
    const from = draggedIdRef.current;
    if (!from || from === hoverId) return;
    setOrderedIds((prev) => {
      const arr = [...prev];
      const fromIdx = arr.indexOf(from);
      const toIdx = arr.indexOf(hoverId);
      if (fromIdx === -1 || toIdx === -1) return prev;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, from);
      return arr;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as FilterTab)}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="planned">Planned</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button
          size="sm"
          onClick={() => {
            setEditingBlock(undefined);
            setFormOpen(true);
          }}
        >
          <Plus className="h-4 w-4" /> New block
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
          <p className="font-display text-lg text-paper">No focus blocks yet</p>
          <p className="max-w-xs text-sm text-muted">
            Create one to set a time goal — Flow will lay out the focus and break cycles for you.
          </p>
          <Button className="mt-2" onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" /> Create your first block
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((block) => {
            const isDragging = draggedId === block.id;
            return (
              <motion.div
                key={block.id}
                layout
                layoutId={block.id}
                animate={{
                  opacity: isDragging ? 0.45 : 1,
                  scale: isDragging ? 1.02 : 1,
                }}
                transition={{ duration: 0.15 }}
                style={{ cursor: isDragging ? "grabbing" : "grab" }}
                draggable
                onDragStart={() => handleDragStart(block.id)}
                onDragEnd={handleDragEnd}
                onDragEnter={(e) => {
                  e.preventDefault();
                  handleDragEnter(block.id);
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <BlockCard
                  block={block}
                  onStart={onSelectBlock}
                  onEdit={(b) => {
                    setEditingBlock(b);
                    setFormOpen(true);
                  }}
                  onDelete={(b) => deleteBlock(b.id)}
                  onRestart={(b) => resetBlock(b.id)}
                  isDragging={isDragging}
                />
              </motion.div>
            );
          })}
        </div>
      )}

      <BlockFormDialog open={formOpen} onOpenChange={setFormOpen} existingBlock={editingBlock} allBlocks={blocks} />
    </div>
  );
}
