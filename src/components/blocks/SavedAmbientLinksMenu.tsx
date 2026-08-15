import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import { useAmbientLinksStore } from "@/store/useAmbientLinksStore";
import { fetchYoutubeTitle } from "@/lib/youtubeOembed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SavedAmbientLinksMenuProps {
  /** The form's current valid ambient link, if any — offered as "Save this link" when not already saved. */
  currentUrl: string | null;
  onSelect: (url: string) => void;
}

export function SavedAmbientLinksMenu({ currentUrl, onSelect }: SavedAmbientLinksMenuProps) {
  const { links, fetchLinks, addLink, deleteLink } = useAmbientLinksStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [labelLoading, setLabelLoading] = useState(false);
  const [position, setPosition] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Rendered via a portal (see below) so the panel can float above the dialog's
  // own `overflow-y-auto` instead of being clipped by it — position is computed
  // from the trigger button's viewport rect and kept in `fixed` coordinates.
  useEffect(() => {
    if (!menuOpen || !triggerRef.current) return;
    const updatePosition = () => {
      const rect = triggerRef.current!.getBoundingClientRect();
      setPosition({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    };
    updatePosition();

    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setAdding(false);
      }
    }
    // Close on scroll — but only when the scroll originates *outside* the
    // floating panel itself (e.g. the user scrolls the page/dialog behind it).
    // Clicks inside the panel can trigger a micro-scroll on the dialog's
    // overflow container; filtering those out prevents the menu from closing
    // before the item's onClick fires.
    function handleScroll(e: Event) {
      if (panelRef.current && panelRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
      setAdding(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [menuOpen]);

  const alreadySaved = currentUrl ? links.some((l) => l.url === currentUrl) : true;

  const startAdding = async () => {
    if (!currentUrl) return;
    setAdding(true);
    setLabelDraft("");
    setLabelLoading(true);
    const title = await fetchYoutubeTitle(currentUrl);
    setLabelLoading(false);
    setLabelDraft(title ?? "");
  };

  const confirmAdd = async () => {
    if (!currentUrl) return;
    await addLink(labelDraft, currentUrl);
    setAdding(false);
  };

  return (
    <>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setMenuOpen((v) => !v)}
        title="Saved links"
        className={menuOpen ? "bg-white/10 text-paper" : ""}
      >
        <ListMusic className="h-4 w-4" />
      </Button>

      {menuOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            data-ambient-panel
            style={{ position: "fixed", top: position.top, right: position.right }}
            className="glass-panel-strong z-[100] w-72 overflow-hidden rounded-xl"
          >
            <div className="max-h-56 overflow-y-auto">
              {links.length === 0 ? (
                <p className="px-3 py-3 text-xs text-muted">No saved links yet.</p>
              ) : (
                links.map((link) => (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => {
                      onSelect(link.url);
                      setMenuOpen(false);
                    }}
                    className="flex w-full items-start justify-between gap-2 px-3 py-2 text-left hover:bg-white/5 transition-colors border-b border-glass-border/40 last:border-0"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-paper/90">{link.label}</span>
                      <span className="block truncate text-[10px] text-muted">{link.url}</span>
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLink(link.id);
                      }}
                      title="Delete saved link"
                      className="shrink-0 rounded p-1 text-muted hover:bg-white/10 hover:text-danger transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </span>
                  </button>
                ))
              )}
            </div>

            {currentUrl && !alreadySaved && (
              <div className="border-t border-glass-border p-2.5">
                {adding ? (
                  <div className="space-y-1.5">
                    <Input
                      autoFocus
                      value={labelDraft}
                      onChange={(e) => setLabelDraft(e.target.value)}
                      placeholder={labelLoading ? "Looking up title…" : "Name this link"}
                      disabled={labelLoading}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          confirmAdd();
                        } else if (e.key === "Escape") {
                          setAdding(false);
                        }
                      }}
                      className="h-8 text-sm"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setAdding(false)}
                        className="rounded-lg px-2 py-1 text-xs text-muted hover:text-paper"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={confirmAdd}
                        disabled={labelLoading}
                        className="rounded-lg border border-focus/40 bg-focus/10 px-2 py-1 text-xs text-focus transition-colors hover:bg-focus/20 disabled:opacity-40"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={startAdding}
                    className="flex w-full items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs text-focus hover:bg-focus/10 transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" /> Save this link
                  </button>
                )}
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}
