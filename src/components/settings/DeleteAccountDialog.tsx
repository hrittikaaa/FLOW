import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/useAuthStore";

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CONFIRM_KEYWORD = "DELETE";

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const { deleteAccount, user } = useAuthStore();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === CONFIRM_KEYWORD;

  const handleClose = (open: boolean) => {
    if (deleting) return; // prevent dismissal while deleting
    setConfirmText("");
    setError(null);
    onOpenChange(open);
  };

  const handleDelete = async () => {
    if (!isConfirmed || deleting) return;
    setDeleting(true);
    setError(null);
    const result = await deleteAccount();
    if (!result.success) {
      setError(result.error ?? "Something went wrong. Please try again.");
      setDeleting(false);
    }
    // On success the auth state change will redirect the user — no extra handling needed.
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-danger">
            <Trash2 className="h-5 w-5 shrink-0" />
            Delete account
          </DialogTitle>
          <DialogDescription>
            This action is permanent and cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {/* Warning banner */}
        <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
            <p className="text-sm font-medium text-danger">What will be deleted</p>
          </div>
          <ul className="ml-6 space-y-1 text-xs text-danger/80 list-disc">
            <li>Your account for <span className="font-medium text-danger">{user?.email}</span></li>
            <li>All your focus blocks and session history</li>
            <li>All analytics and logged focus time</li>
            <li>Your profile and preference settings</li>
          </ul>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDelete();
          }}
          className="contents"
        >
          {/* Confirmation input */}
          <div className="space-y-2">
            <Label htmlFor="delete-confirm-input" className="text-sm normal-case text-muted">
              Type <span className="font-mono font-semibold text-paper">{CONFIRM_KEYWORD}</span> to confirm
            </Label>
            <Input
              id="delete-confirm-input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_KEYWORD}
              disabled={deleting}
              className={
                confirmText.length > 0 && !isConfirmed
                  ? "border-danger/50 focus:ring-danger/40"
                  : ""
              }
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </div>

          {/* Error state */}
          <AnimatePresence>
            {error && (
              <motion.p
                key="delete-error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="text-xs text-danger"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <DialogFooter>
            <Button
              id="delete-account-cancel-btn"
              type="button"
              variant="ghost"
              onClick={() => handleClose(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              id="delete-account-confirm-btn"
              type="submit"
              variant="danger"
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
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
