import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";

interface AutoPauseToastProps {
  pausedBlockName: string | null;
  onDismiss: () => void;
}

/** Bottom-right toast warning that a previously-running block was paused to make way for a new one. */
export function AutoPauseToast({ pausedBlockName, onDismiss }: AutoPauseToastProps) {
  useEffect(() => {
    if (!pausedBlockName) return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [pausedBlockName, onDismiss]);

  return (
    <AnimatePresence>
      {pausedBlockName && (
        <motion.div
          key="auto-pause-toast"
          initial={{ opacity: 0, y: 16, x: 0 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.2 }}
          className="fixed bottom-5 right-5 z-[60] flex max-w-sm items-start gap-3 rounded-xl border border-amber-500/30 bg-ink-raised/95 px-4 py-3 text-sm text-amber-300 shadow-[0_8px_32px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <span className="flex-1">
            <span className="font-medium text-amber-200">"{pausedBlockName}"</span> was paused to start this
            block. You can pick it back up from the Blocks tab.
          </span>
          <button onClick={onDismiss} className="shrink-0 rounded p-0.5 hover:bg-white/10 transition-colors">
            <X className="h-3.5 w-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
