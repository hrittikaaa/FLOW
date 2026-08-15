import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useQueueStore } from "@/store/useQueueStore";
import { BlockCard } from "@/components/blocks/BlockCard";
import { BlockCardSkeleton } from "@/components/blocks/BlockCardSkeleton";
import { BlockFormDialog } from "@/components/blocks/BlockFormDialog";
import { QueueBar } from "@/components/blocks/QueueBar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FocusBlock } from "@/types";

interface BlocksDashboardProps {
  onSelectBlock: (block: FocusBlock) => void;
  onResumeBlock: (block: FocusBlock) => void;
  /** Starts a planned block in place, without switching to the timer view. */
  onQuickStartBlock: (block: FocusBlock) => void;
}

type FilterTab = "all" | "active" | "planned" | "completed";

const FILTER_ORDER: FilterTab[] = ["all", "active", "planned", "completed"];
const PAGE_SIZE = 6;

/** Slides the incoming filter's results in from the direction it was navigated toward. */
const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -24 }),
};
const slideTransition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const };

export function BlocksDashboard({ onSelectBlock, onResumeBlock, onQuickStartBlock }: BlocksDashboardProps) {
  const { blocks, loading, deleteBlock, resetBlock } = useBlocksStore();
  const { items: queueItems, addBlock: addToQueue, removeBlock: removeFromQueue } = useQueueStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FocusBlock | undefined>(undefined);
  const [tab, setTab] = useState<FilterTab>("all");
  const [tabDirection, setTabDirection] = useState(0);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  /** The block ID whose card should be pulsed+scrolled to after a QueueBar click. */
  const [highlightedBlockId, setHighlightedBlockId] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** One ref per rendered card so we can scroll to it. */
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const handleTabChange = (next: FilterTab) => {
    setTabDirection(FILTER_ORDER.indexOf(next) > FILTER_ORDER.indexOf(tab) ? 1 : -1);
    setTab(next);
    setPage(1);
  };

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

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  // Clamp instead of resetting to 1 so deleting the last item on a trailing
  // page steps back a page rather than jumping the user to the start.
  useEffect(() => {
    setPage((p) => Math.min(p, pageCount));
  }, [pageCount]);
  const pageStart = (page - 1) * PAGE_SIZE;
  const paginated = filtered.slice(pageStart, pageStart + PAGE_SIZE);

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

  const queuedBlockIds = useMemo(
    () => new Set(queueItems.filter((i) => i.kind === "block").map((i) => i.blockId)),
    [queueItems]
  );

  function handleToggleQueue(block: FocusBlock) {
    if (queuedBlockIds.has(block.id)) {
      removeFromQueue(block.id);
    } else {
      addToQueue(block.id);
    }
  }

  const handleHighlightBlock = useCallback((blockId: string) => {
    // If the block isn't on the current page/tab, switch to "all" tab first
    const blockExists = blocks.some((b) => b.id === blockId && b.status !== "archived");
    if (!blockExists) return;

    // Find which page the block is on under the current filter and switch there
    const allNonArchived = blocks.filter((b) => b.status !== "archived");
    const globalIdx = allNonArchived.findIndex((b) => b.id === blockId);
    if (globalIdx === -1) return;

    // Ensure we're on the "all" tab so the block is visible
    if (tab !== "all") {
      handleTabChange("all");
    }

    // Determine what page the block will be on
    const targetPage = Math.floor(globalIdx / PAGE_SIZE) + 1;
    setPage(targetPage);

    setHighlightedBlockId(blockId);
    if (highlightTimeoutRef.current) clearTimeout(highlightTimeoutRef.current);
    highlightTimeoutRef.current = setTimeout(() => setHighlightedBlockId(null), 2000);

    // Scroll after a short delay to allow re-render
    setTimeout(() => {
      const el = cardRefs.current.get(blockId);
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  }, [blocks, tab, handleTabChange]);

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
      <QueueBar onHighlightBlock={handleHighlightBlock} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => handleTabChange(v as FilterTab)}>
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

      <div className="overflow-x-clip">
        <AnimatePresence mode="wait" custom={tabDirection}>
          <motion.div
            key={tab}
            custom={tabDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            {loading && blocks.length === 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <BlockCardSkeleton key={i} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-panel flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
                <p className="font-display text-lg text-paper">Nothing here yet</p>
                <p className="max-w-xs text-sm text-muted">
                  Create a block to set a time goal. Flow will break it into focus and rest cycles for you.
                </p>
                <Button className="mt-2" onClick={() => setFormOpen(true)}>
                  <Plus className="h-4 w-4" /> Create your first block
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {paginated.map((block) => {
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
                      ref={(el) => {
                        if (el) cardRefs.current.set(block.id, el);
                        else cardRefs.current.delete(block.id);
                      }}
                    >
                      <BlockCard
                        block={block}
                        onStart={onSelectBlock}
                        onQuickStart={onQuickStartBlock}
                        onResume={onResumeBlock}
                        onEdit={(b) => {
                          setEditingBlock(b);
                          setFormOpen(true);
                        }}
                        onDelete={(b) => deleteBlock(b.id)}
                        onRestart={(b) => resetBlock(b.id)}
                        isDragging={isDragging}
                        queued={queuedBlockIds.has(block.id)}
                        onToggleQueue={handleToggleQueue}
                        highlighted={highlightedBlockId === block.id}
                      />
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {!loading && pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="icon"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular text-sm text-muted">
            Page {page} of {pageCount}
          </span>
          <Button
            variant="outline"
            size="icon"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <BlockFormDialog open={formOpen} onOpenChange={setFormOpen} existingBlock={editingBlock} allBlocks={blocks} />
    </div>
  );
}
