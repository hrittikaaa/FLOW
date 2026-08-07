import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/blocks/CategorySelect";
import { useBlocksStore } from "@/store/useBlocksStore";

interface ManualEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful save so charts can refetch. */
  onLogged?: () => void;
}

function toLocalDateInputValue(d: Date) {
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export function ManualEntryDialog({ open, onOpenChange, onLogged }: ManualEntryDialogProps) {
  const logManualSession = useBlocksStore((s) => s.logManualSession);
  const [category, setCategory] = useState("General");
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [date, setDate] = useState(() => toLocalDateInputValue(new Date()));
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCategory("General");
    setHours("0");
    setMinutes("30");
    setDate(toLocalDateInputValue(new Date()));
    setNote("");
    setError(null);
  };

  const handleSave = async () => {
    const totalMinutes = (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    if (totalMinutes <= 0) {
      setError("Enter a duration greater than 0.");
      return;
    }
    setSaving(true);
    setError(null);
    // Anchor to noon local time so the date doesn't shift a day when read back in UTC.
    const occurredAt = new Date(`${date}T12:00:00`).toISOString();
    const ok = await logManualSession({ category, durationMinutes: totalMinutes, occurredAt, note });
    setSaving(false);
    if (!ok) {
      setError("Couldn't save that entry — try again.");
      return;
    }
    reset();
    onOpenChange(false);
    onLogged?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log focus time</DialogTitle>
          <DialogDescription>
            Add focus time you tracked outside the app — it'll show up alongside your other sessions in analytics.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <CategorySelect value={category} onChange={setCategory} />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="manual-hours">Hours</Label>
              <Input
                id="manual-hours"
                type="number"
                min={0}
                max={24}
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="manual-minutes">Minutes</Label>
              <Input
                id="manual-minutes"
                type="number"
                min={0}
                max={59}
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-date">Date</Label>
            <Input id="manual-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="manual-note">Note (optional)</Label>
            <Input
              id="manual-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Read research paper"
            />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Log time"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
