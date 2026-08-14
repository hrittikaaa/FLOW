import { Timer } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

interface LandingNavProps {
  onSignIn: () => void;
}

export function LandingNav({ onSignIn }: LandingNavProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 z-40 w-full border-b border-glass-border bg-ink/55 backdrop-blur-2xl backdrop-saturate-150 shadow-glass-sm"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-focus/15 text-focus">
            <Timer className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-medium text-paper">Flow</span>
        </div>

        {/* Nav links — hidden on mobile */}
        <nav className="hidden items-center gap-6 text-sm text-muted sm:flex">
          <a href="#how-it-works" className="transition-colors hover:text-paper">How it works</a>
          <a href="#features" className="transition-colors hover:text-paper">Features</a>
        </nav>

        {/* CTA */}
        <Button
          id="landing-nav-signin-btn"
          variant="outline"
          size="sm"
          onClick={onSignIn}
        >
          Sign in
        </Button>
      </div>
    </motion.header>
  );
}
