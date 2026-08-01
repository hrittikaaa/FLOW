import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useProfileStore } from "@/store/useProfileStore";
import { useNotifications } from "@/hooks/useNotifications";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { profile, updateDefaults } = useProfileStore();
  const [focus, setFocus] = useState(30);
  const [brk, setBrk] = useState(5);
  const [longBrk, setLongBrk] = useState(15);
  const [sessions, setSessions] = useState(4);
  const [saving, setSaving] = useState(false);

  const { supported, permission, enabled, enable, disable } = useNotifications();
  const [notifRequesting, setNotifRequesting] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setFocus(profile.defaultFocusMinutes);
      setBrk(profile.defaultBreakMinutes);
      setLongBrk(profile.defaultLongBreakMinutes);
      setSessions(profile.sessionsBeforeLongBreak);
    }
  }, [profile, open]);

  const handleSave = async () => {
    setSaving(true);
    await updateDefaults({
      defaultFocusMinutes: focus,
      defaultBreakMinutes: brk,
      defaultLongBreakMinutes: longBrk,
      sessionsBeforeLongBreak: sessions,
    });
    setSaving(false);
    onOpenChange(false);
  };

  const handleNotifToggle = async () => {
    if (enabled) {
      disable();
      return;
    }
    setNotifRequesting(true);
    await enable();
    setNotifRequesting(false);
  };

  const notifLabel = () => {
    if (!supported) return "Not supported in this browser";
    if (permission === "denied") return "Blocked by browser — allow in site settings";
    if (enabled) return "Enabled — you'll get alerts on segment & block completion";
    return "Disabled";
  };

  const notifBtnLabel = () => {
    if (notifRequesting) return "Requesting…";
    if (enabled) return "Disable";
    if (permission === "denied") return "Blocked";
    return "Enable";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Default ratio</DialogTitle>
          <DialogDescription>
            Used to pre-fill new focus blocks. You can still override the ratio per block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Focus length</Label>
              <span className="tabular font-mono text-sm text-focus">{focus}m</span>
            </div>
            <Slider min={5} max={90} step={5} value={[focus]} onValueChange={([v]) => setFocus(v)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Break length</Label>
              <span className="tabular font-mono text-sm text-rest">{brk}m</span>
            </div>
            <Slider min={0} max={30} step={5} value={[brk]} onValueChange={([v]) => setBrk(v)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Long break length</Label>
              <span className="tabular font-mono text-sm text-rest">{longBrk}m</span>
            </div>
            <Slider min={0} max={45} step={5} value={[longBrk]} onValueChange={([v]) => setLongBrk(v)} />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label>Sessions per long break</Label>
              <span className="tabular font-mono text-sm text-paper">{sessions}</span>
            </div>
            <Slider min={2} max={8} step={1} value={[sessions]} onValueChange={([v]) => setSessions(v)} />
          </div>

          {/* ── Desktop Notifications ───────────────────────────────────── */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none">🔔</span>
                <Label className="leading-tight">Desktop notifications</Label>
              </div>
              <Button
                id="notif-toggle-btn"
                size="sm"
                variant={enabled ? "ghost" : "default"}
                onClick={handleNotifToggle}
                disabled={!supported || permission === "denied" || notifRequesting}
                className="shrink-0"
              >
                {notifBtnLabel()}
              </Button>
            </div>
            <p className="text-xs text-muted leading-snug">{notifLabel()}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save defaults"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

