import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useTimerStore } from "@/store/useTimerStore";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Header } from "@/components/layout/Header";
import { LiquidBackground } from "@/components/layout/LiquidBackground";
import { BlocksDashboard } from "@/components/blocks/BlocksDashboard";
import { TimerView } from "@/components/timer/TimerView";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { MonthlyChart } from "@/components/analytics/MonthlyChart";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const { activeBlockId, isRunning, pause } = useTimerStore();
  const [view, setView] = useState<AppView>("dashboard");
  const [viewDirection, setViewDirection] = useState(0);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("weekly");
  const [chartDirection, setChartDirection] = useState(0);
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

  if (initializing) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted">
        <LiquidBackground />
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <>
        <LiquidBackground />
        <AuthScreen />
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
            {view === "dashboard" && <BlocksDashboard onSelectBlock={handleSelectBlock} />}
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
                <div className="flex justify-center">
                  <Tabs value={chartMode} onValueChange={(v) => handleChartModeChange(v as ChartMode)}>
                    <TabsList>
                      {(["weekly", "monthly"] as ChartMode[]).map((mode) => (
                        <TabsTrigger key={mode} id={`chart-mode-${mode}`} value={mode} className="px-5 capitalize">
                          {mode}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
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
                      {chartMode === "weekly" ? <WeeklyChart /> : <MonthlyChart />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      <Analytics />
    </div>
  );
}

export default App;
