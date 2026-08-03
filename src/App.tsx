import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { useTimerStore } from "@/store/useTimerStore";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Header } from "@/components/layout/Header";
import { BlocksDashboard } from "@/components/blocks/BlocksDashboard";
import { TimerView } from "@/components/timer/TimerView";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import { MonthlyChart } from "@/components/analytics/MonthlyChart";
import type { FocusBlock } from "@/types";
import { Analytics } from "@vercel/analytics/react";


export type AppView = "dashboard" | "timer" | "analytics";
type ChartMode = "weekly" | "monthly";

function App() {
  const { init, session, initializing } = useAuthStore();
  const { fetchBlocks, subscribeRealtime, blocks } = useBlocksStore();
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const { activeBlockId, isRunning, pause } = useTimerStore();
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [chartMode, setChartMode] = useState<ChartMode>("weekly");
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
        Loading…
      </div>
    );
  }

  if (!session) {
    return <AuthScreen />;
  }

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
    setView("timer");
  };

  return (
    <div className="min-h-screen">
      <Header view={view} onViewChange={setView} />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {view === "dashboard" && <BlocksDashboard onSelectBlock={handleSelectBlock} />}
            {view === "timer" && (
              <TimerView
                blockId={selectedBlockId}
                onPickBlock={() => setView("dashboard")}
                pausedBlockName={pausedBlockName}
                onDismissPausedWarning={() => setPausedBlockName(null)}
              />
            )}
            {view === "analytics" && (
              <div className="flex flex-col gap-6">
                {/* Toggle */}
                <div className="flex justify-center">
                  <div
                    role="tablist"
                    className="flex gap-1 rounded-xl border border-white/8 bg-white/4 p-1"
                  >
                    {(["weekly", "monthly"] as ChartMode[]).map((mode) => (
                      <button
                        key={mode}
                        id={`chart-mode-${mode}`}
                        role="tab"
                        aria-selected={chartMode === mode}
                        onClick={() => setChartMode(mode)}
                        className={[
                          "rounded-lg px-5 py-1.5 text-sm font-medium capitalize transition-all duration-200",
                          chartMode === mode
                            ? "bg-white/10 text-paper shadow-sm"
                            : "text-muted hover:text-paper/70",
                        ].join(" ")}
                      >
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chart panel */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={chartMode}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                  >
                    {chartMode === "weekly" ? <WeeklyChart /> : <MonthlyChart />}
                  </motion.div>
                </AnimatePresence>
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
