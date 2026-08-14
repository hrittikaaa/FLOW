import { create } from "zustand";

interface DocumentPictureInPicture {
  requestWindow: (options?: { width?: number; height?: number }) => Promise<Window>;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function isPipSupported(): boolean {
  return typeof window !== "undefined" && "documentPictureInPicture" in window;
}

/** Clones every stylesheet from the main document into the pip window so Tailwind classes render there too. */
function copyStyles(pipWindow: Window) {
  [...document.styleSheets].forEach((sheet) => {
    try {
      const cssRules = [...sheet.cssRules].map((r) => r.cssText).join("");
      const style = pipWindow.document.createElement("style");
      style.textContent = cssRules;
      pipWindow.document.head.appendChild(style);
    } catch {
      // Cross-origin sheet — cssRules access throws. Fall back to re-linking it.
      if (sheet.href) {
        const link = pipWindow.document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = sheet.href;
        pipWindow.document.head.appendChild(link);
      }
    }
  });
}

interface PipState {
  pipWindow: Window | null;
  open: () => Promise<void>;
  close: () => void;
}

export const usePipStore = create<PipState>((set, get) => ({
  pipWindow: null,

  open: async () => {
    if (!isPipSupported() || get().pipWindow) return;
    const pipWindow = await window.documentPictureInPicture!.requestWindow({ width: 380, height: 64 });

    copyStyles(pipWindow);
    pipWindow.document.title = "Flow — Timer";
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.className = "bg-ink";

    pipWindow.addEventListener("pagehide", () => {
      set({ pipWindow: null });
    });

    set({ pipWindow });
  },

  close: () => {
    get().pipWindow?.close();
    set({ pipWindow: null });
  },
}));
