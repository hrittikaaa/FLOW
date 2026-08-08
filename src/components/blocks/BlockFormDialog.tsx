import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SliderWithInput } from "@/components/ui/slider-input";
import { TimelineStrip } from "@/components/timer/TimelineStrip";
import { TaskList } from "@/components/blocks/TaskList";
import { CategorySelect } from "@/components/blocks/CategorySelect";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { generateSessionPlan } from "@/lib/sessionCalculator";
import { cn } from "@/lib/utils";
import type { AmbientSound, BlockDraft, FocusBlock } from "@/types";

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
  const [longBreaksEnabled, setLongBreaksEnabled] = useState(true);
  // Remembers the last non-zero long-break length so toggling back on
  // restores it instead of dropping the user back to some fixed default.
  const lastLongBreakRef = useRef(15);

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
      setLongBreaksEnabled(existingBlock.longBreakMinutes > 0);
      if (existingBlock.longBreakMinutes > 0) lastLongBreakRef.current = existingBlock.longBreakMinutes;
    } else {
      const defaultLongBreak = profile?.defaultLongBreakMinutes ?? emptyDraft.longBreakMinutes;
      setDraft({
        ...emptyDraft,
        focusMinutes: profile?.defaultFocusMinutes ?? emptyDraft.focusMinutes,
        breakMinutes: profile?.defaultBreakMinutes ?? emptyDraft.breakMinutes,
        longBreakMinutes: defaultLongBreak,
        sessionsBeforeLongBreak: profile?.sessionsBeforeLongBreak ?? emptyDraft.sessionsBeforeLongBreak,
      });
      setLongBreaksEnabled(defaultLongBreak > 0);
      if (defaultLongBreak > 0) lastLongBreakRef.current = defaultLongBreak;
      setGoalsText("");
    }
  }, [existingBlock, open, profile]);

  // Focus length can't usefully exceed the total time goal — beyond that
  // there's no room left for even one break. Scales up for long segments
  // (e.g. a 6h block can take a 2h focus stretch) instead of capping at a
  // fixed 90m for everyone.
  const focusMax = Math.max(5, draft.totalMinutes);

  useEffect(() => {
    if (draft.focusMinutes > focusMax) {
      setDraft((d) => ({ ...d, focusMinutes: focusMax }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusMax]);

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
    if (saving) return;
    const finalName = draft.name.trim() || "Untitled Block";
    setSaving(true);
    if (isEdit && existingBlock) {
      await updateBlockMeta(existingBlock.id, { ...draft, name: finalName });
    } else {
      const taskTitles = goalsText.split("\n").map((t) => t.trim()).filter(Boolean);
      await createBlock({ ...draft, name: finalName, taskTitles });
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
            <CategorySelect
              value={draft.category}
              onChange={(category) => setDraft((d) => ({ ...d, category }))}
            />
            <div className="space-y-1.5">
              <Label htmlFor="ambient">Ambient sound</Label>
              <select
                id="ambient"
                value={draft.ambientSound}
                onChange={(e) => setDraft((d) => ({ ...d, ambientSound: e.target.value as AmbientSound }))}
                className="glass-field h-10 w-full rounded-lg px-3 text-sm text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus/50"
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
            <SliderWithInput
              min={15}
              max={480}
              step={15}
              value={draft.totalMinutes}
              onValueChange={(v) => setDraft((d) => ({ ...d, totalMinutes: v }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label>Focus length</Label>
              <SliderWithInput
                min={5}
                max={focusMax}
                step={5}
                value={draft.focusMinutes}
                onValueChange={(v) => setDraft((d) => ({ ...d, focusMinutes: v }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Break length</Label>
              <SliderWithInput
                min={0}
                max={30}
                step={5}
                value={draft.breakMinutes}
                onValueChange={(v) => setDraft((d) => ({ ...d, breakMinutes: v }))}
              />
            </div>
            <div className={cn("space-y-1.5 transition-opacity", !longBreaksEnabled && "pointer-events-none opacity-40")}>
              <Label>Long break</Label>
              <SliderWithInput
                min={5}
                max={45}
                step={5}
                value={longBreaksEnabled ? draft.longBreakMinutes : lastLongBreakRef.current}
                onValueChange={(v) => {
                  lastLongBreakRef.current = v;
                  setDraft((d) => ({ ...d, longBreakMinutes: v }));
                }}
              />
            </div>
            <div className={cn("space-y-1.5 transition-opacity", !longBreaksEnabled && "pointer-events-none opacity-40")}>
              <Label>Sessions per long break</Label>
              <SliderWithInput
                min={2}
                max={8}
                step={1}
                unit=""
                value={draft.sessionsBeforeLongBreak}
                onValueChange={(v) => setDraft((d) => ({ ...d, sessionsBeforeLongBreak: v }))}
              />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="text-sm font-medium text-paper">Long breaks</p>
              <p className="text-xs text-muted">Skip the longer break between session groups entirely.</p>
            </div>
            <Switch
              checked={longBreaksEnabled}
              onCheckedChange={(v) => {
                setLongBreaksEnabled(v);
                setDraft((d) => ({ ...d, longBreakMinutes: v ? lastLongBreakRef.current : 0 }));
              }}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="text-sm font-medium text-paper">Strict mode</p>
              <p className="text-xs text-muted">Locks editing and warns before you leave the tab once started.</p>
            </div>
            <Switch
              checked={draft.strictMode}
              onCheckedChange={(v) => setDraft((d) => ({ ...d, strictMode: v }))}
            />
          </div>

          <div className="space-y-2 rounded-lg border border-glass-border bg-white/[0.02] p-4 backdrop-blur-sm">
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
          <Button onClick={handleSave} disabled={isLocked || saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create block"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
