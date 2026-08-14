import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, ArrowLeft, BarChart3, ShieldCheck, RefreshCw, ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { GoogleIcon } from "@/components/auth/GoogleIcon";

interface AuthScreenProps {
  onBack?: () => void;
}

/* Floating timer mockup (smaller version for the side panel) */
function SideVisual() {
  return (
    <motion.div
      animate={{ y: [0, -8, 0] }}
      transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      className="glass-panel mx-auto w-full max-w-[280px] p-6"
    >
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-focus/15 text-focus">
          <Timer className="h-3 w-3" />
        </div>
        <span className="font-display text-xs font-medium text-paper">Morning writing</span>
        <span className="ml-auto rounded-full bg-focus/15 px-2 py-0.5 text-[10px] text-focus">Active</span>
      </div>

      {/* Mini ring */}
      <div className="relative mx-auto mb-4 flex h-32 w-32 items-center justify-center">
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
          <circle
            cx="50" cy="50" r="42"
            fill="none"
            stroke="#F2A65A"
            strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray="263.9"
            strokeDashoffset="79.2"
            className="drop-shadow-[0_0_6px_rgba(242,166,90,0.7)]"
          />
        </svg>
        <div className="flex flex-col items-center gap-0.5">
          <span className="font-mono text-2xl font-medium tabular text-paper">22:14</span>
          <span className="text-[10px] text-focus">Focus</span>
        </div>
      </div>

      {/* Segments */}
      <div className="mb-4 flex items-center justify-center gap-1.5">
        {[
          { kind: "focus", done: true },
          { kind: "break", done: true },
          { kind: "focus", active: true },
          { kind: "break" },
          { kind: "focus" },
        ].map((s, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full ${
              (s as { active?: boolean }).active
                ? "w-7 bg-focus shadow-[0_0_6px_rgba(242,166,90,0.6)]"
                : s.kind === "focus"
                ? s.done ? "w-4 bg-focus/40" : "w-4 bg-focus/20"
                : s.done ? "w-3 bg-rest/40" : "w-3 bg-rest/20"
            }`}
          />
        ))}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        {[["2h 30m", "Goal"], ["1h 05m", "Done"], ["3", "Cycles"]].map(([val, label]) => (
          <div key={label} className="rounded-lg bg-white/5 px-2 py-2">
            <div className="font-mono text-sm font-medium text-paper">{val}</div>
            <div className="text-[10px] text-muted">{label}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* Feature pill shown in the left panel */
function FeaturePill({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-glass-border bg-white/[0.03] px-4 py-3">
      <div className="shrink-0 text-focus">{icon}</div>
      <span className="text-sm text-muted">{text}</span>
    </div>
  );
}

type Mode = "signin" | "signup" | "forgot";

export function AuthScreen({ onBack }: AuthScreenProps) {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle, sendPasswordReset, authError } =
    useAuthStore();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    if (mode === "forgot") {
      const ok = await sendPasswordReset(email);
      if (ok) setNotice("Check your inbox for a link to reset your password.");
      setSubmitting(false);
      return;
    }
    const ok =
      mode === "signin"
        ? await signInWithPassword(email, password)
        : await signUpWithPassword(email, password);
    if (ok && mode === "signup")
      setNotice("Check your inbox to confirm your email, then sign in.");
    setSubmitting(false);
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signInWithGoogle();
    setGoogleLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel: brand story + visual */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-glass-border p-10 lg:flex lg:w-[52%]">
        {/* Subtle glow blobs */}
        <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-focus/12 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-rest/10 blur-3xl" />

        {/* Logo */}
        <div className="relative flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus/15 text-focus">
            <Timer className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-medium text-paper">Flow</span>
        </div>

        {/* Center content */}
        <div className="relative flex flex-col gap-10">
          <div>
            <h2 className="mb-3 font-display text-3xl font-semibold leading-tight text-paper">
              Your focus, finally<br />
              <span className="bg-gradient-to-r from-focus to-rest bg-clip-text text-transparent">
                under control
              </span>
            </h2>
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Flow turns a vague "I should work on this" into a proper block of time with built-in breaks, ambient sound, and a timer that actually keeps you honest.
            </p>
          </div>

          <SideVisual />

          <div className="grid grid-cols-1 gap-2">
            <FeaturePill
              icon={<RefreshCw className="h-4 w-4" />}
              text="Auto-paced breaks so you don't burn out"
            />
            <FeaturePill
              icon={<BarChart3 className="h-4 w-4" />}
              text="Weekly charts to see where your time goes"
            />
            <FeaturePill
              icon={<ShieldCheck className="h-4 w-4" />}
              text="Strict mode for when you really need to focus"
            />
          </div>
        </div>

        {/* Bottom quote */}
        <blockquote className="relative text-xs text-muted italic">
          "Clarity about what matters provides clarity about what does not."
          <br />
          <cite className="not-italic text-muted/60">Cal Newport</cite>
        </blockquote>
      </div>

      {/* Right panel: form */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        {/* Back link */}
        {onBack && (
          <motion.button
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onBack}
            className="mb-8 flex items-center gap-1.5 self-start text-xs text-muted transition-colors hover:text-paper"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to home
          </motion.button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile logo */}
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus/15 text-focus">
              <Timer className="h-4 w-4" />
            </div>
            <span className="font-display text-base font-medium text-paper">Flow</span>
          </div>

          {/* Heading */}
          <div className="mb-8">
            <AnimatePresence mode="wait">
              <motion.h1
                key={mode}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="mb-1 font-display text-2xl font-semibold text-paper"
              >
                {mode === "signin" ? "Welcome back" : mode === "signup" ? "Create your account" : "Reset your password"}
              </motion.h1>
            </AnimatePresence>
            <p className="text-sm text-muted">
              {mode === "signin"
                ? "Sign in to pick up right where you left off."
                : mode === "signup"
                ? "It takes less than a minute to get your first block running."
                : "We'll email you a link to set a new password."}
            </p>
          </div>

          {mode !== "forgot" && (
            <>
              <Button
                id="auth-google-btn"
                type="button"
                variant="outline"
                className="w-full gap-2"
                disabled={googleLoading}
                onClick={handleGoogle}
              >
                <GoogleIcon />
                {googleLoading ? "Redirecting..." : "Continue with Google"}
              </Button>

              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-glass-border" />
                <span className="text-[11px] uppercase tracking-wide text-muted">or</span>
                <div className="h-px flex-1 bg-glass-border" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
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
            {mode !== "forgot" && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auth-password">Password</Label>
                  {mode === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setMode("forgot");
                        setNotice(null);
                      }}
                      className="text-xs text-muted transition-colors hover:text-paper"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <PasswordInput
                  id="auth-password"
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            )}

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
                : mode === "signup"
                ? "Create account"
                : "Send reset link"}
              {!submitting && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          {/* Mode toggle */}
          <div className="mt-6 text-center">
            {mode === "forgot" ? (
              <button
                onClick={() => {
                  setMode("signin");
                  setNotice(null);
                }}
                className="text-sm text-muted transition-colors hover:text-paper"
              >
                Back to sign in
              </button>
            ) : (
              <button
                onClick={() => {
                  setMode(mode === "signin" ? "signup" : "signin");
                  setNotice(null);
                }}
                className="text-sm text-muted transition-colors hover:text-paper"
              >
                {mode === "signin"
                  ? "New here? Create a free account"
                  : "Already have an account? Sign in"}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
