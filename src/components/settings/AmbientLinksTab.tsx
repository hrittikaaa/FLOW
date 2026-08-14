import { useEffect, useState } from "react";
import { ListMusic, Plus, Trash2 } from "lucide-react";
import { useAmbientLinksStore } from "@/store/useAmbientLinksStore";
import { parseYoutubeInput } from "@/lib/youtube";
import { fetchYoutubeTitle } from "@/lib/youtubeOembed";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Full management panel for saved ambient YouTube links — the profile-level
 *  counterpart to the compact picker in BlockFormDialog's SavedAmbientLinksMenu. */
export function AmbientLinksTab() {
  const { links, loading, fetchLinks, addLink, deleteLink } = useAmbientLinksStore();
  const [urlText, setUrlText] = useState("");
  const [labelText, setLabelText] = useState("");
  const [labelLoading, setLabelLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchLinks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = urlText.trim() ? parseYoutubeInput(urlText.trim()) : null;
  const showInvalid = urlText.trim().length > 0 && !parsed;

  const handleUrlBlur = async () => {
    if (!parsed || labelText.trim()) return;
    setLabelLoading(true);
    const title = await fetchYoutubeTitle(urlText.trim());
    setLabelLoading(false);
    if (title) setLabelText(title);
  };

  const handleAdd = async () => {
    if (!parsed || saving) return;
    setSaving(true);
    await addLink(labelText, urlText.trim());
    setSaving(false);
    setUrlText("");
    setLabelText("");
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Saved links</Label>
        {loading && links.length === 0 ? (
          <p className="px-1 py-4 text-center text-xs text-muted">Loading…</p>
        ) : links.length === 0 ? (
          <div className="flex flex-col items-center gap-1.5 rounded-lg border border-glass-border bg-white/[0.02] px-4 py-6 text-center">
            <ListMusic className="h-5 w-5 text-muted" />
            <p className="text-xs text-muted">No saved links yet — add one below.</p>
          </div>
        ) : (
          <div className="max-h-64 space-y-1.5 overflow-y-auto rounded-lg border border-glass-border bg-white/[0.02] p-1.5">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 hover:bg-white/5 transition-colors"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm text-paper/90">{link.label}</p>
                  <p className="truncate text-[10px] text-muted">{link.url}</p>
                </div>
                <button
                  onClick={() => deleteLink(link.id)}
                  title="Delete saved link"
                  className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2 rounded-lg border border-glass-border bg-white/[0.02] p-4 backdrop-blur-sm">
        <Label className="normal-case">Add a link</Label>
        <Input
          value={urlText}
          onChange={(e) => setUrlText(e.target.value)}
          onBlur={handleUrlBlur}
          placeholder="Paste a YouTube or YouTube Music video/playlist link"
        />
        {showInvalid && <p className="text-xs text-danger">That doesn't look like a valid YouTube link.</p>}
        {parsed && (
          <Input
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            placeholder={labelLoading ? "Looking up title…" : "Name this link"}
            disabled={labelLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
        )}
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          disabled={!parsed || saving || labelLoading}
          className="gap-1.5"
        >
          <Plus className="h-3.5 w-3.5" />
          {saving ? "Saving…" : "Save link"}
        </Button>
      </div>
    </div>
  );
}
