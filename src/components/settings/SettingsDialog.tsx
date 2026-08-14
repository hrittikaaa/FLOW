import { useEffect, useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { SliderWithInput } from "@/components/ui/slider-input";
import { AmbientLinksTab } from "@/components/settings/AmbientLinksTab";
import { CategoriesTab } from "@/components/settings/CategoriesTab";
import { useProfileStore } from "@/store/useProfileStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotifications } from "@/hooks/useNotifications";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRM_KEYWORD = "DELETE";
type SettingsTab = "general" | "links" | "categories";

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { profile, updateDefaults } = useProfileStore();
  const { deleteAccount, user } = useAuthStore();
  const [tab, setTab] = useState<SettingsTab>("general");
  const [focus, setFocus] = useState(30);
  const [brk, setBrk] = useState(5);
  const [longBrk, setLongBrk] = useState(15);
  const [sessions, setSessions] = useState(4);
  const [longBreaksEnabled, setLongBreaksEnabled] = useState(true);
  const [timePassedEnabled, setTimePassedEnabled] = useState(false);
  const [timePassedInterval, setTimePassedInterval] = useState(30);
  const [saving, setSaving] = useState(false);

  // Danger zone expands in place instead of opening a second dialog on top of
  // this one — avoids the doubled backdrop/blur and the spacing jump that
  // came with nesting a Dialog inside a Dialog.
  const [deleteExpanded, setDeleteExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isConfirmed = confirmText === CONFIRM_KEYWORD;

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
    if (!open) {
      // Collapse + reset the danger zone, and land back on the first tab, whenever the settings dialog closes.
      setDeleteExpanded(false);
      setConfirmText("");
      setDeleteError(null);
      setTab("general");
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

  const closeDeleteSection = () => {
    if (deleting) return;
    setDeleteExpanded(false);
    setConfirmText("");
    setDeleteError(null);
  };

  const handleDeleteAccount = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    const result = await deleteAccount();
    if (!result.success) {
      setDeleteError(result.error ?? "Something went wrong. Please try again.");
      setDeleting(false);
    }
    // On success the auth state change will redirect the user — no extra handling needed.
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>
            {tab === "general"
              ? "These are the defaults used when creating a new focus block. You can still tweak them per block."
              : tab === "links"
              ? "Manage your saved YouTube/YouTube Music links for ambient audio — pick from these when creating or editing a block."
              : "Manage the categories offered when creating or editing a block."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as SettingsTab)}>
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="links">Ambient Links</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-5">
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

          {/* ── Danger Zone ─────────────────────────────────────────────── */}
          <div className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 space-y-3 backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-danger/70">Danger zone</p>

            {!deleteExpanded ? (
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
                  onClick={() => setDeleteExpanded(true)}
                  className="shrink-0 gap-1.5"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            ) : (
              <motion.form
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleDeleteAccount();
                }}
                className="space-y-3"
              >
                <div className="space-y-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                    <p className="text-sm font-medium text-danger">This is permanent</p>
                  </div>
                  <ul className="ml-6 space-y-1 text-xs text-danger/80 list-disc">
                    <li>
                      Your account for <span className="font-medium text-danger">{user?.email}</span>
                    </li>
                    <li>All your focus blocks and session history</li>
                    <li>All analytics and logged focus time</li>
                    <li>Your profile and preference settings</li>
                  </ul>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="delete-confirm-input" className="text-sm normal-case text-muted">
                    Type <span className="font-mono font-semibold text-paper">{CONFIRM_KEYWORD}</span> to confirm
                  </Label>
                  <Input
                    id="delete-confirm-input"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder={CONFIRM_KEYWORD}
                    disabled={deleting}
                    className={confirmText.length > 0 && !isConfirmed ? "border-danger/50 focus:ring-danger/40" : ""}
                    autoComplete="off"
                    spellCheck={false}
                    autoFocus
                  />
                </div>

                <AnimatePresence>
                  {deleteError && (
                    <motion.p
                      key="delete-error"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="text-xs text-danger"
                    >
                      {deleteError}
                    </motion.p>
                  )}
                </AnimatePresence>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    id="delete-account-cancel-btn"
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={closeDeleteSection}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    id="delete-account-confirm-btn"
                    type="submit"
                    variant="danger"
                    size="sm"
                    disabled={!isConfirmed || deleting}
                    className="gap-2"
                  >
                    {deleting ? (
                      <>
                        <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Deleting…
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete my account
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            )}
          </div>
          </TabsContent>

          <TabsContent value="links">
            <AmbientLinksTab />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
        </Tabs>

        {tab === "general" && !deleteExpanded && (
          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : "Save defaults"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
