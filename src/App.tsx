import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useTimerStore } from "@/store/useTimerStore";
import { useRoute } from "@/hooks/useRoute";
import { AuthModal } from "@/components/auth/AuthModal";
import { ResetPasswordScreen } from "@/components/auth/ResetPasswordScreen";
import { Header } from "@/components/layout/Header";
import { LiquidBackground } from "@/components/layout/LiquidBackground";
import { LandingPage } from "@/components/landing/LandingPage";
import { BlocksDashboard } from "@/components/blocks/BlocksDashboard";
import { TimerView } from "@/components/timer/TimerView";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { MonthlyChart } from "@/components/analytics/MonthlyChart";
import { ManualEntryDialog } from "@/components/analytics/ManualEntryDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

import type { FocusBlock } from "@/types";
import { Analytics } from "@vercel/analytics/react";


export type AppView = "dashboard" | "timer" | "analytics";
type ChartMode = "weekly" | "monthly";

const VIEW_ORDER: AppView[] = ["dashboard", "timer", "analytics"];
const CHART_MODE_ORDER: ChartMode[] = ["weekly", "monthly"];

/** Slides the incoming view in from the direction it was navigated toward, and the outgoing view out the opposite side. */
const slideVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 28 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -28 }),
};
const slideTransition = { duration: 0.32, ease: [0.22, 1, 0.36, 1] as const };

function App() {
  const { init, session, initializing } = useAuthStore();
  const { fetchBlocks, subscribeRealtime, blocks } = useBlocksStore();
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const { activeBlockId, isRunning, pause, resume } = useTimerStore();
  const { route, navigate } = useRoute();
  const [view, setView] = useState<AppView>("dashboard");
  const [viewDirection, setViewDirection] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("weekly");
  const [chartDirection, setChartDirection] = useState(0);
  const [manualEntryOpen, setManualEntryOpen] = useState(false);
  const [analyticsRefreshKey, setAnalyticsRefreshKey] = useState(0);
  /** Name of the block that was auto-paused when a new one was started. */
  const [pausedBlockName, setPausedBlockName] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = init();
    return unsubscribe;
  }, [init]);

  useEffect(() => {
    if (!session) return;
    fetchBlocks();
    fetchProfile();
    const unsubscribe = subscribeRealtime();
    return unsubscribe;
  }, [session, fetchBlocks, fetchProfile, subscribeRealtime]);

  // Warn before closing/refreshing when a timer is actively running
  useEffect(() => {
    if (!isRunning) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Modern browsers ignore the custom message and show their own,
      // but setting returnValue is still required to trigger the dialog.
      e.returnValue = "A focus timer is still running. Are you sure you want to leave?";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning]);

  // When auth is resolved, redirect appropriately
  useEffect(() => {
    if (initializing) return;
    if (session && (route === "/" || route === "/login")) {
      navigate("/app");
    } else if (!session && route === "/app") {
      navigate("/");
    }
  }, [session, initializing, route, navigate]);

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        <LiquidBackground />
        Loading...
      </div>
    );
  }

  // The password-reset email link lands here — Supabase exchanges the recovery
  // token in the URL for a session behind the scenes, so this route is shown
  // regardless of the current session state.
  if (route === "/reset-password") {
    return (
      <>
        <LiquidBackground />
        <ResetPasswordScreen onDone={() => navigate("/app")} />
      </>
    );
  }

  // Public routes -- landing page always visible; auth modal layers on top when /login
  if (!session) {
    return (
      <>
        <LiquidBackground />
        {/* Landing page is always mounted as the background */}
        <div
          className="transition-[filter] duration-300"
          style={{
            filter: route === "/login" ? "blur(3px)" : "none",
            pointerEvents: route === "/login" ? "none" : "auto",
          }}
        >
          <LandingPage onGetStarted={() => navigate("/login")} />
        </div>

        {/* Auth modal floats on top when /login */}
        <AnimatePresence>
          {route === "/login" && (
            <AuthModal onClose={() => navigate("/")} />
          )}
        </AnimatePresence>
      </>
    );
  }

  const handleViewChange = (next: AppView) => {
    setViewDirection(VIEW_ORDER.indexOf(next) > VIEW_ORDER.indexOf(view) ? 1 : -1);
    setView(next);
  };

  const handleSelectBlock = (block: FocusBlock) => {
    // If a different block is actively running, pause it first and record its name
    // so the TimerView can display a contextual warning to the user.
    if (isRunning && activeBlockId && activeBlockId !== block.id) {
      const running = blocks.find((b) => b.id === activeBlockId);
      setPausedBlockName(running?.name ?? "Previous block");
      pause();
    } else {
      setPausedBlockName(null);
    }
    setSelectedBlockId(block.id);
    handleViewChange("timer");
  };

  /** Resume a paused block directly from the dashboard — no view switch needed. */
  const handleResumeBlock = (block: FocusBlock) => {
    // If a different block is running, pause it first (silently — no warning needed
    // since the user is staying on the dashboard, not opening the timer view).
    if (isRunning && activeBlockId && activeBlockId !== block.id) {
      pause();
    }
    // Point the timer store at this block if it isn't already, then resume.
    useTimerStore.setState({ activeBlockId: block.id });
    resume();
  };

  const handleChartModeChange = (next: ChartMode) => {
    setChartDirection(CHART_MODE_ORDER.indexOf(next) > CHART_MODE_ORDER.indexOf(chartMode) ? 1 : -1);
    setChartMode(next);
  };

  return (
    <div className="min-h-screen">
      <LiquidBackground />
      <Header view={view} onViewChange={handleViewChange} />
      <main className="mx-auto max-w-6xl overflow-x-clip px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait" custom={viewDirection}>
          <motion.div
            key={view}
            custom={viewDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={slideTransition}
          >
            {view === "dashboard" && <BlocksDashboard onSelectBlock={handleSelectBlock} onResumeBlock={handleResumeBlock} />}
            {view === "timer" && (
              <TimerView
                blockId={selectedBlockId}
                onPickBlock={() => handleViewChange("dashboard")}
                pausedBlockName={pausedBlockName}
                onDismissPausedWarning={() => setPausedBlockName(null)}
              />
            )}
            {view === "analytics" && (
              <div className="flex flex-col gap-6">
                {/* Toggle */}
                <div className="relative flex justify-center">
                  <Tabs value={chartMode} onValueChange={(v) => handleChartModeChange(v as ChartMode)}>
                    <TabsList>
                      {(["weekly", "monthly"] as ChartMode[]).map((mode) => (
                        <TabsTrigger key={mode} id={`chart-mode-${mode}`} value={mode} className="px-5 capitalize">
                          {mode}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                  <Button
                    id="log-focus-time-btn"
                    size="sm"
                    variant="primary"
                    onClick={() => setManualEntryOpen(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 gap-1"
                  >
                    <Plus size={14} /> Log time
                  </Button>
                </div>

                {/* Chart panel */}
                <div className="overflow-x-clip">
                  <AnimatePresence mode="wait" custom={chartDirection}>
                    <motion.div
                      key={chartMode}
                      custom={chartDirection}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={slideTransition}
                    >
                      {chartMode === "weekly" ? (
                        <WeeklyChart refreshKey={analyticsRefreshKey} />
                      ) : (
                        <MonthlyChart refreshKey={analyticsRefreshKey} />
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <ManualEntryDialog
        open={manualEntryOpen}
        onOpenChange={setManualEntryOpen}
        onLogged={() => setAnalyticsRefreshKey((k) => k + 1)}
      />
      <Analytics />
    </div>
  );
}

export default App;
