import { useEffect, useState } from "react";

/**
 * When `active` is true (a running block with strict_mode on):
 *  - intercepts tab close/refresh with the browser's native confirmation prompt
 *  - tracks whether the user navigated away to another tab/app, so the UI
 *    can nudge them back on return (browsers do not allow a page to block
 *    tab switching outright — this is the closest safe approximation)
 *
 * Editing/deleting the active block is disabled elsewhere in the UI
 * whenever `active` is true, which covers the "can't click away and edit"
 * requirement within the app itself.
 */
export function useStrictModeGuard(active: boolean) {
  const [strayed, setStrayed] = useState(false);

  useEffect(() => {
    if (!active) return;

    const beforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const visibilityChange = () => {
      if (document.hidden) setStrayed(true);
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("visibilitychange", visibilityChange);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("visibilitychange", visibilityChange);
    };
  }, [active]);

  useEffect(() => {
    if (!active) setStrayed(false);
  }, [active]);

  return { strayed, clearStrayed: () => setStrayed(false) };
}
