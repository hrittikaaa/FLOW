import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { TimelineStrip } from "@/components/timer/TimelineStrip";
import { TaskList } from "@/components/blocks/TaskList";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { generateSessionPlan } from "@/lib/sessionCalculator";
import type { AmbientSound, BlockDraft, FocusBlock } from "@/types";

const CATEGORIES = ["Coding", "Studying", "Writing", "Design", "Reading", "Admin", "General"];
const AMBIENT_OPTIONS: { value: AmbientSound; label: string }[] = [
  { value: "none", label: "None" },
  { value: "white-noise", label: "White noise" },
  { value: "rain", label: "Rain" },
  { value: "lofi", label: "Lo-fi hum" },
];

interface BlockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingBlock?: FocusBlock;
  allBlocks: FocusBlock[];
}

const emptyDraft: BlockDraft = {
  name: "",
  category: "General",
  totalMinutes: 180,
  focusMinutes: 30,
  breakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  strictMode: false,
  ambientSound: "none",
  taskTitles: [],
};

export function BlockFormDialog({ open, onOpenChange, existingBlock, allBlocks }: BlockFormDialogProps) {
  const { createBlock, updateBlockMeta } = useBlocksStore();
  const profile = useProfileStore((s) => s.profile);
  const [draft, setDraft] = useState<BlockDraft>(emptyDraft);
  const [goalsText, setGoalsText] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = Boolean(existingBlock);
  const isLocked = Boolean(existingBlock?.strictMode && existingBlock?.status === "active");

  useEffect(() => {
    if (existingBlock) {
      setDraft({
        name: existingBlock.name,
        category: existingBlock.category,
        totalMinutes: existingBlock.totalMinutes,
        focusMinutes: existingBlock.focusMinutes,
        breakMinutes: existingBlock.breakMinutes,
        longBreakMinutes: existingBlock.longBreakMinutes,
        sessionsBeforeLongBreak: existingBlock.sessionsBeforeLongBreak,
        strictMode: existingBlock.strictMode,
        ambientSound: existingBlock.ambientSound,
        taskTitles: [],
      });
    } else {
      setDraft({
        ...emptyDraft,
        focusMinutes: profile?.defaultFocusMinutes ?? emptyDraft.focusMinutes,
        breakMinutes: profile?.defaultBreakMinutes ?? emptyDraft.breakMinutes,
        longBreakMinutes: profile?.defaultLongBreakMinutes ?? emptyDraft.longBreakMinutes,
        sessionsBeforeLongBreak: profile?.sessionsBeforeLongBreak ?? emptyDraft.sessionsBeforeLongBreak,
      });
      setGoalsText("");
    }
  }, [existingBlock, open, profile]);

  const previewPlan = useMemo(
    () =>
      generateSessionPlan({
        totalMinutes: draft.totalMinutes,
        focusMinutes: draft.focusMinutes,
        breakMinutes: draft.breakMinutes,
        longBreakMinutes: draft.longBreakMinutes,
        sessionsBeforeLongBreak: draft.sessionsBeforeLongBreak,
      }),
    [draft.totalMinutes, draft.focusMinutes, draft.breakMinutes, draft.longBreakMinutes, draft.sessionsBeforeLongBreak]
  );

  const handleSave = async () => {
    if (!draft.name.trim() || saving) return;
    setSaving(true);
    if (isEdit && existingBlock) {
      await updateBlockMeta(existingBlock.id, draft);
    } else {
      const taskTitles = goalsText.split("\n").map((t) => t.trim()).filter(Boolean);
      await createBlock({ ...draft, taskTitles });
    }
    setSaving(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit focus block" : "New focus block"}</DialogTitle>
          <DialogDescription>
            {isLocked
              ? "This block is running in strict mode — pause it or wait until it finishes to change the plan."
              : "Set a total time goal and Flow will divide it into focus and break cycles automatically."}
          </DialogDescription>
        </DialogHeader>

        <fieldset disabled={isLocked} className="space-y-5 disabled:opacity-50">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                placeholder="e.g. Thesis writing sprint"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                value={draft.category}
                onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                className="h-10 w-full rounded-lg border border-glass-border bg-white/[0.03] px-3 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c} className="bg-ink-raised">
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ambient">Ambient sound</Label>
              <select
                id="ambient"
                value={draft.ambientSound}
                onChange={(e) => setDraft((d) => ({ ...d, ambientSound: e.target.value as AmbientSound }))}
                className="h-10 w-full rounded-lg border border-glass-border bg-white/[0.03] px-3 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
              >
                {AMBIENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-ink-raised">
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Total time goal</Label>
              <span className="tabular font-mono text-sm text-paper">
                {Math.floor(draft.totalMinutes / 60)}h {draft.totalMinutes % 60}m
              </span>
            </div>
            <Slider
              min={15}
              max={480}
              step={15}
              value={[draft.totalMinutes]}
              onValueChange={([v]) => setDraft((d) => ({ ...d, totalMinutes: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Focus length</Label>
                <span className="tabular font-mono text-sm text-focus">{draft.focusMinutes}m</span>
              </div>
              <Slider
                min={5}
                max={90}
                step={5}
                value={[draft.focusMinutes]}
                onValueChange={([v]) => setDraft((d) => ({ ...d, focusMinutes: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Break length</Label>
                <span className="tabular font-mono text-sm text-rest">{draft.breakMinutes}m</span>
              </div>
              <Slider
                min={0}
                max={30}
                step={5}
                value={[draft.breakMinutes]}
                onValueChange={([v]) => setDraft((d) => ({ ...d, breakMinutes: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Long break</Label>
                <span className="tabular font-mono text-sm text-rest">{draft.longBreakMinutes}m</span>
              </div>
              <Slider
                min={0}
                max={45}
                step={5}
                value={[draft.longBreakMinutes]}
                onValueChange={([v]) => setDraft((d) => ({ ...d, longBreakMinutes: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Sessions per long break</Label>
                <span className="tabular font-mono text-sm text-paper">{draft.sessionsBeforeLongBreak}</span>
              </div>
              <Slider
                min={2}
                max={8}
                step={1}
                value={[draft.sessionsBeforeLongBreak]}
                onValueChange={([v]) => setDraft((d) => ({ ...d, sessionsBeforeLongBreak: v }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3">
            <div>
              <p className="text-sm font-medium text-paper">Strict mode</p>
              <p className="text-xs text-muted">Locks editing and warns before you leave the tab once started.</p>
            </div>
            <Switch
              checked={draft.strictMode}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, strictMode: v }))}
            />
          </div>

          <div className="space-y-2 rounded-lg border border-glass-border bg-white/[0.02] p-4">
            <Label>Timeline preview</Label>
            <TimelineStrip segments={previewPlan} compact />
          </div>

          {isEdit && existingBlock ? (
            <div className="space-y-2">
              <Label>Goals</Label>
              <TaskList
                block={existingBlock}
                otherBlocks={allBlocks.filter((b) => b.id !== existingBlock.id)}
                disabled={isLocked}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="goals">Goals (one per line)</Label>
              <Textarea
                id="goals"
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                placeholder={"Outline chapter 3\nRespond to reviewer comments\nUpdate bibliography"}
                rows={3}
              />
            </div>
          )}
        </fieldset>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLocked || saving || !draft.name.trim()}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
