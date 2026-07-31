import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
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
  const { blocks, deleteBlock } = useBlocksStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<FocusBlock | undefined>(undefined);
  const [tab, setTab] = useState<FilterTab>("all");

  const filtered = useMemo(() => {
    if (tab === "all") return blocks.filter((b) => b.status !== "archived");
    if (tab === "completed") return blocks.filter((b) => b.status === "completed");
    return blocks.filter((b) => b.status === tab);
  }, [blocks, tab]);

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
          <AnimatePresence>
            {filtered.map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                onStart={onSelectBlock}
                onEdit={(b) => {
                  setEditingBlock(b);
                  setFormOpen(true);
                }}
                onDelete={(b) => deleteBlock(b.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <BlockFormDialog open={formOpen} onOpenChange={setFormOpen} existingBlock={editingBlock} allBlocks={blocks} />
    </div>
  );
}
