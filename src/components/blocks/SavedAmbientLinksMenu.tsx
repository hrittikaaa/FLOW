import { useEffect, useRef, useState } from "react";
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
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setAdding(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
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
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={() => setMenuOpen((v) => !v)}
        title="Saved links"
        className={menuOpen ? "bg-white/10 text-paper" : ""}
      >
        <ListMusic className="h-4 w-4" />
      </Button>

      {menuOpen && (
        <div className="glass-panel-strong absolute right-0 top-11 z-20 w-72 overflow-hidden rounded-xl">
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
        </div>
      )}
    </div>
  );
}
