import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAuthStore } from "@/store/useAuthStore";
import { useBlocksStore } from "@/store/useBlocksStore";
import { useProfileStore } from "@/store/useProfileStore";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { Header } from "@/components/layout/Header";
import { BlocksDashboard } from "@/components/blocks/BlocksDashboard";
import { TimerView } from "@/components/timer/TimerView";
import { WeeklyChart } from "@/components/analytics/WeeklyChart";
import type { FocusBlock } from "@/types";

export type AppView = "dashboard" | "timer" | "analytics";

function App() {
  const { init, session, initializing } = useAuthStore();
  const { fetchBlocks, subscribeRealtime } = useBlocksStore();
  const fetchProfile = useProfileStore((s) => s.fetchProfile);
  const [view, setView] = useState<AppView>("dashboard");
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

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
              <TimerView blockId={selectedBlockId} onPickBlock={() => setView("dashboard")} />
            )}
            {view === "analytics" && (
              <div className="mx-auto max-w-2xl">
                <WeeklyChart />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
