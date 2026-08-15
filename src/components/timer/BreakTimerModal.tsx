import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Coffee, Pause, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreakTimerModalProps {
  minutes: number;
  onClose: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function BreakTimerModal({ minutes, onClose }: BreakTimerModalProps) {
  const totalSeconds = minutes * 60;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [running, setRunning] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const anchorRef = useRef<{ baseMs: number; baseRemaining: number } | null>(null);

  const startInterval = (currentRemaining: number) => {
    anchorRef.current = { baseMs: Date.now(), baseRemaining: currentRemaining };
    intervalRef.current = setInterval(() => {
      if (!anchorRef.current) return;
      const elapsed = (Date.now() - anchorRef.current.baseMs) / 1000;
      const next = Math.max(0, Math.round(anchorRef.current.baseRemaining - elapsed));
      setRemaining(next);
      if (next <= 0) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setRunning(false);
      }
    }, 200);
  };

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    startInterval(totalSeconds);
    return stopInterval;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePlayPause = () => {
    if (running) {
      stopInterval();
      setRunning(false);
    } else {
      startInterval(remaining);
      setRunning(true);
    }
  };

  const progress = 1 - remaining / totalSeconds;
  const circumference = 2 * Math.PI * 72;
  const dashOffset = circumference * (1 - progress);
  const isDone = remaining <= 0;

  return (
    <AnimatePresence>
      <motion.div
        key="break-modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: "rgba(10,10,18,0.72)", backdropFilter: "blur(8px)" }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          key="break-modal-panel"
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="glass-panel relative flex flex-col items-center gap-6 px-10 py-10 w-[340px]"
        >
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-muted hover:bg-white/10 hover:text-paper transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-center gap-2 text-rest">
            <Coffee className="h-5 w-5" />
            <span className="font-display text-sm font-medium uppercase tracking-widest">Break</span>
          </div>

          <div className="relative flex items-center justify-center" style={{ width: 180, height: 180 }}>
            <svg width="180" height="180" className="absolute inset-0 -rotate-90" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="72" fill="none" strokeWidth="7" stroke="rgba(111,214,198,0.12)" />
              <circle
                cx="90" cy="90" r="72"
                fill="none"
                strokeWidth="7"
                stroke="#6FD6C6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 0.2s linear", filter: "drop-shadow(0 0 6px rgba(111,214,198,0.6))" }}
              />
            </svg>
            <div className="flex flex-col items-center gap-1">
              <span className="font-display text-4xl font-semibold tabular" style={{ color: isDone ? "#6FD6C6" : "#e8e8f0" }}>
                {isDone ? "Done!" : formatTime(remaining)}
              </span>
              <span className="text-xs text-muted">{minutes}m break</span>
            </div>
          </div>

          {!isDone ? (
            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={handlePlayPause}
                title={running ? "Pause break" : "Resume break"}
              >
                {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 translate-x-0.5" />}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-muted">Break is over - time to focus!</p>
              <Button variant="primary" size="sm" onClick={onClose}>Close</Button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}