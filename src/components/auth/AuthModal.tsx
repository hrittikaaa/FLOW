import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ArrowRight, X } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const { signInWithPassword, signUpWithPassword, authError } = useAuthStore();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    const ok =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    if (ok && mode === "signup")
      setNotice("Check your inbox to confirm your email, then sign in.");
    setSubmitting(false);
  };

  return (
    /* Backdrop */
    <motion.div
      key="auth-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backdropFilter: "blur(18px) saturate(140%)", WebkitBackdropFilter: "blur(18px) saturate(140%)", backgroundColor: "rgba(10,10,20,0.55)" }}
      onClick={onClose}
    >
      {/* Card — stop click bubbling */}
      <motion.div
        key="auth-card"
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel w-full max-w-[400px] p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top row: logo + close */}
        <div className="mb-7 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-focus/15 text-focus">
              <Timer className="h-3.5 w-3.5" />
            </div>
            <span className="font-display text-sm font-medium text-paper">Flow</span>
          </div>
          <button
            onClick={onClose}
            aria-label="Back to home"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-glass-border bg-white/[0.04] text-muted transition-colors hover:bg-white/10 hover:text-paper"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Heading */}
        <div className="mb-6">
          <AnimatePresence mode="wait">
            <motion.h1
              key={mode}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="mb-1 font-display text-xl font-semibold text-paper"
            >
              {mode === "signin" ? "Welcome back" : "Create your account"}
            </motion.h1>
          </AnimatePresence>
          <p className="text-sm text-muted">
            {mode === "signin"
              ? "Sign in to pick up right where you left off."
              : "Takes less than a minute to get your first block running."}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
            />
          </div>

          <AnimatePresence>
            {authError && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger"
              >
                {authError}
              </motion.p>
            )}
            {notice && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-rest/30 bg-rest/10 px-3 py-2 text-xs text-rest"
              >
                {notice}
              </motion.p>
            )}
          </AnimatePresence>

          <Button
            id="auth-submit-btn"
            type="submit"
            className="w-full gap-2"
            disabled={submitting}
          >
            {submitting
              ? "Just a sec..."
              : mode === "signin"
              ? "Sign in"
              : "Create account"}
            {!submitting && <ArrowRight className="h-4 w-4" />}
          </Button>
        </form>

        {/* Mode toggle */}
        <div className="mt-5 text-center">
          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setNotice(null);
            }}
            className="text-xs text-muted transition-colors hover:text-paper"
          >
            {mode === "signin"
              ? "New here? Create a free account"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
