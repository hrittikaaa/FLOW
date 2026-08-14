import { createPortal } from "react-dom";
import { usePipStore } from "@/store/usePipStore";
import { MiniTimerWindow } from "@/components/timer/MiniTimerWindow";

/** Mounted once at the app root so the pop-out timer keeps working regardless
 *  of which in-app view (dashboard/timer/analytics) is currently showing. */
export function MiniTimerPortal() {
  const pipWindow = usePipStore((s) => s.pipWindow);
  if (!pipWindow) return null;
  return createPortal(<MiniTimerWindow />, pipWindow.document.body);
}
