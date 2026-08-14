import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Timer, ArrowRight, CheckCircle2 } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface ResetPasswordScreenProps {
  onDone: () => void;
}

/**
 * Landed on after the user clicks the password-reset link in their email.
 * Supabase exchanges the recovery token in the URL for a session automatically
 * (via `onAuthStateChange` / `getSession`), so by the time this renders the
 * user is already authenticated and we just need a new password from them.
 */
export function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const { updatePassword, authError } = useAuthStore();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setSubmitting(true);
    const ok = await updatePassword(password);
    setSubmitting(false);
    if (ok) setDone(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel w-full max-w-[400px] p-8"
      >
        <div className="mb-7 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-focus/15 text-focus">
            <Timer className="h-3.5 w-3.5" />
          </div>
          <span className="font-display text-sm font-medium text-paper">Flow</span>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="h-10 w-10 text-rest" />
            <h1 className="font-display text-xl font-semibold text-paper">Password updated</h1>
            <p className="text-sm text-muted">You're all set — continue on into Flow.</p>
            <Button id="reset-continue-btn" className="mt-2 w-full gap-2" onClick={onDone}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="mb-1 font-display text-xl font-semibold text-paper">Set a new password</h1>
              <p className="text-sm text-muted">Choose something you haven't used before.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="reset-password">New password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="reset-confirm-password">Confirm password</Label>
                <Input
                  id="reset-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type it again"
                />
              </div>

              {(mismatch || authError) && (
                <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                  {mismatch ? "Passwords don't match." : authError}
                </p>
              )}

              <Button id="reset-submit-btn" type="submit" className="w-full gap-2" disabled={submitting}>
                {submitting ? "Updating..." : "Update password"}
                {!submitting && <ArrowRight className="h-4 w-4" />}
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
