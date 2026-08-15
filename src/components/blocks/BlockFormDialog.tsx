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
import { SavedAmbientLinksMenu } from "@/components/blocks/SavedAmbientLinksMenu";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { generateSessionPlan } from "@/lib/sessionCalculator";
import { parseYoutubeInput } from "@/lib/youtube";
import type { BlockDraft, FocusBlock } from "@/types";

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
  ambientYoutubeUrl: null,
  ambientVolume: 50,
  taskTitles: [],
};

export function BlockFormDialog({ open, onOpenChange, existingBlock, allBlocks }: BlockFormDialogProps) {
  const { createBlock, updateBlockMeta } = useBlocksStore();
  const profile = useProfileStore((s) => s.profile);
  // `existingBlock` is a snapshot captured when the dialog was opened — for
  // the goals list we want the live version so edits elsewhere (or a
  // just-completed sync) are reflected instead of showing a stale, possibly
  // task-less snapshot while the dialog sits open.
  const liveExistingBlock = useBlocksStore((s) => (existingBlock ? s.blocks.find((b) => b.id === existingBlock.id) : undefined)) ?? existingBlock;
  const [draft, setDraft] = useState<BlockDraft>(emptyDraft);
  const [goalsText, setGoalsText] = useState("");
  const [saving, setSaving] = useState(false);
  // Raw text of the ambient-audio URL field, tracked separately from
  // draft.ambientYoutubeUrl so the user can type/paste freely — it's only
  // parsed (and the draft updated) once it resolves to a valid link.
  const [youtubeUrlText, setYoutubeUrlText] = useState("");

  const isEdit = Boolean(existingBlock);
  const isLocked = Boolean(existingBlock?.strictMode && existingBlock?.status === "active");
  // Long breaks are enabled/disabled globally from Settings — this form only
  // surfaces the length/cadence controls when that account-level switch is on.
  const longBreaksEnabled = profile?.longBreaksEnabled ?? true;

  // Track the previous `open` value so we only reset state when the dialog
  // transitions from closed -> open. Skipping the reset on other re-renders
  // (e.g. tab/window focus changes) keeps inputs intact while editing.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    prevOpenRef.current = open;
    if (!justOpened) return;

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
        ambientYoutubeUrl: existingBlock.ambientYoutubeUrl,
        ambientVolume: existingBlock.ambientVolume,
        taskTitles: [],
      });
      setYoutubeUrlText(existingBlock.ambientYoutubeUrl ?? "");
    } else {
      const defaultLongBreak = profile?.longBreaksEnabled === false ? 0 : profile?.defaultLongBreakMinutes ?? emptyDraft.longBreakMinutes;
      setDraft({
        ...emptyDraft,
        focusMinutes: profile?.defaultFocusMinutes ?? emptyDraft.focusMinutes,
        breakMinutes: profile?.defaultBreakMinutes ?? emptyDraft.breakMinutes,
        longBreakMinutes: defaultLongBreak,
        sessionsBeforeLongBreak: profile?.sessionsBeforeLongBreak ?? emptyDraft.sessionsBeforeLongBreak,
      });
      setGoalsText("");
      setYoutubeUrlText("");
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
      <DialogContent
        className="max-w-2xl"
        onInteractOutside={(e) => {
          // The ambient links panel is portaled to document.body (outside the
          // Radix dialog DOM tree). Without this guard, Radix treats clicks on
          // it as "interact outside" and swallows the pointer event before the
          // link button's onClick can fire.
          const target = e.target as Element | null;
          if (target?.closest("[data-ambient-panel]")) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit focus block" : "New focus block"}</DialogTitle>
          <DialogDescription>
            {isLocked
              ? "This block is running in strict mode. Pause it first, or wait until it finishes, to make changes."
              : "Set a total time goal and Flow will split it into focus and break sessions for you."}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
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
            <div className="col-span-2">
              <CategorySelect
                value={draft.category}
                onChange={(category) => setDraft((d) => ({ ...d, category }))}
              />
            </div>
          </div>

          <div className="space-y-1.5 rounded-lg border border-glass-border bg-white/[0.02] p-4 backdrop-blur-sm">
            <Label htmlFor="ambient-url">Background Audio</Label>
            <div className="flex gap-2">
              <Input
                id="ambient-url"
                value={youtubeUrlText}
                onChange={(e) => {
                  const value = e.target.value;
                  setYoutubeUrlText(value);
                  const trimmed = value.trim();
                  if (!trimmed) {
                    setDraft((d) => ({ ...d, ambientYoutubeUrl: null }));
                  } else if (parseYoutubeInput(trimmed)) {
                    setDraft((d) => ({ ...d, ambientYoutubeUrl: trimmed }));
                  } else {
                    setDraft((d) => ({ ...d, ambientYoutubeUrl: null }));
                  }
                }}
                placeholder="Paste a YouTube or YouTube Music video/playlist link"
                className="flex-1"
              />
              <SavedAmbientLinksMenu
                currentUrl={draft.ambientYoutubeUrl}
                onSelect={(url) => {
                  setYoutubeUrlText(url);
                  setDraft((d) => ({ ...d, ambientYoutubeUrl: url }));
                }}
              />
            </div>
            {youtubeUrlText.trim().length > 0 && !draft.ambientYoutubeUrl && (
              <p className="text-xs text-danger">That doesn't look like a valid YouTube link.</p>
            )}
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
            {longBreaksEnabled && (
              <>
                <div className="space-y-1.5">
                  <Label>Long break</Label>
                  <SliderWithInput
                    min={5}
                    max={45}
                    step={5}
                    value={draft.longBreakMinutes}
                    onValueChange={(v) => setDraft((d) => ({ ...d, longBreakMinutes: v }))}
                  />
                </div>
                <div className="space-y-1.5">
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
              </>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3 backdrop-blur-sm">
            <div>
              <p className="text-sm font-medium text-paper">Strict mode</p>
              <p className="text-xs text-muted">Locks settings while running and gives you a heads-up if you try to close the tab.</p>
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

          {isEdit && liveExistingBlock ? (
            <div className="space-y-2">
              <Label>Goals</Label>
              <TaskList
                block={liveExistingBlock}
                otherBlocks={allBlocks.filter((b) => b.id !== liveExistingBlock.id)}
                disabled={isLocked}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="goals">Goals</Label>
              <Textarea
                id="goals"
                value={goalsText}
                onChange={(e) => setGoalsText(e.target.value)}
                placeholder={"Outline chapter 3\nReply to reviewer comments\nUpdate bibliography"}
                rows={3}
              />
            </div>
          )}
        </fieldset>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLocked || saving}>
            {saving ? "Saving…" : isEdit ? "Save changes" : "Create block"}
          </Button>
        </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
