import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SliderWithInput } from "@/components/ui/slider-input";
import { useProfileStore } from "@/store/useProfileStore";
import { useNotifications } from "@/hooks/useNotifications";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";

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
  const [longBreaksEnabled, setLongBreaksEnabled] = useState(true);
  const [timePassedEnabled, setTimePassedEnabled] = useState(false);
  const [timePassedInterval, setTimePassedInterval] = useState(30);
  const [saving, setSaving] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const { supported, permission, enabled, enable, disable } = useNotifications();
  const [notifRequesting, setNotifRequesting] = useState(false);

  useEffect(() => {
    if (profile && open) {
      setFocus(profile.defaultFocusMinutes);
      setBrk(profile.defaultBreakMinutes);
      setLongBrk(profile.defaultLongBreakMinutes);
      setSessions(profile.sessionsBeforeLongBreak);
      setLongBreaksEnabled(profile.longBreaksEnabled);
      setTimePassedEnabled(profile.timePassedNotifyEnabled);
      setTimePassedInterval(profile.timePassedNotifyIntervalMinutes);
    }
  }, [profile, open]);

  const handleSave = async () => {
    setSaving(true);
    await updateDefaults({
      defaultFocusMinutes: focus,
      defaultBreakMinutes: brk,
      defaultLongBreakMinutes: longBrk,
      sessionsBeforeLongBreak: sessions,
      longBreaksEnabled,
      timePassedNotifyEnabled: timePassedEnabled,
      timePassedNotifyIntervalMinutes: timePassedInterval,
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
    if (!supported) return "Your browser doesn't support desktop notifications.";
    if (permission === "denied") return "Blocked by your browser. You can allow it in your site settings.";
    if (enabled) return "On. You'll get a ping when a segment or block finishes.";
    return "Off";
  };

  const notifBtnLabel = () => {
    if (notifRequesting) return "Requesting…";
    if (enabled) return "Disable";
    if (permission === "denied") return "Blocked";
    return "Enable";
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Default ratio</DialogTitle>
          <DialogDescription>
            These are the defaults used when creating a new focus block. You can still tweak them per block.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <Label>Focus length</Label>
            <SliderWithInput min={5} max={90} step={5} value={focus} onValueChange={setFocus} />
          </div>
          <div className="space-y-1.5">
            <Label>Break length</Label>
            <SliderWithInput min={0} max={30} step={5} value={brk} onValueChange={setBrk} />
          </div>
          {/* ── Long breaks ─────────────────────────────────────────────── */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="leading-tight">Long breaks</Label>
                <p className="text-xs text-muted leading-snug">
                  Adds a longer break every few sessions on new blocks. You can adjust the length and timing below.
                </p>
              </div>
              <Switch checked={longBreaksEnabled} onCheckedChange={setLongBreaksEnabled} />
            </div>
            {longBreaksEnabled && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <Label>Long break length</Label>
                  <SliderWithInput min={5} max={45} step={5} value={longBrk} onValueChange={setLongBrk} />
                </div>
                <div className="space-y-1.5">
                  <Label>Sessions per long break</Label>
                  <SliderWithInput min={2} max={8} step={1} unit="" value={sessions} onValueChange={setSessions} />
                </div>
              </div>
            )}
          </div>

          {/* ── Time-passed notification ────────────────────────────────── */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-3 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label className="leading-tight">Gentle nudges while you work</Label>
                <p className="text-xs text-muted leading-snug">
                  Get a quiet reminder every few minutes so you never lose track of time.
                </p>
              </div>
              <Switch checked={timePassedEnabled} onCheckedChange={setTimePassedEnabled} />
            </div>
            {timePassedEnabled && (
              <div className="space-y-1.5 pt-1">
                <Label>Remind me every</Label>
                <SliderWithInput min={5} max={120} step={5} value={timePassedInterval} onValueChange={setTimePassedInterval} />
              </div>
            )}
          </div>

          {/* ── Desktop Notifications ───────────────────────────────────── */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 space-y-2 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base leading-none">🔔</span>
                <Label className="leading-tight">Desktop notifications</Label>
              </div>
              <Button
                id="notif-toggle-btn"
                size="sm"
                variant={enabled ? "ghost" : "primary"}
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

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 space-y-2 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-danger/70">Danger zone</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-paper leading-tight">Delete account</p>
                <p className="text-xs text-muted leading-snug mt-0.5">
                  Permanently erase your account and all associated data.
                </p>
              </div>
              <Button
                id="delete-account-open-btn"
                size="sm"
                variant="danger"
                onClick={() => setDeleteAccountOpen(true)}
                className="shrink-0 gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
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

    <DeleteAccountDialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen} />
    </>
  );
}

