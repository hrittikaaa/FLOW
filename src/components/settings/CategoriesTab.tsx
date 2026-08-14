import { useEffect } from "react";
import { RotateCcw, Trash2 } from "lucide-react";
import { COMMON_CATEGORIES, useCategoriesStore } from "@/store/useCategoriesStore";
import { Label } from "@/components/ui/label";
import { buildColorMap } from "@/components/analytics/analyticsUtils";

/** Full category management panel: delete built-in or custom categories (built-ins
 *  are hidden per-account rather than actually removed), and restore hidden ones. */
export function CategoriesTab() {
  const { customCategories, hiddenCategories, loading, fetchCategories, deleteCategory, restoreCategory } =
    useCategoriesStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const visibleDefaults = COMMON_CATEGORIES.filter((c) => !hiddenCategories.includes(c));
  const colorMap = buildColorMap([...visibleDefaults, ...customCategories]);

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Default categories</Label>
        {loading && visibleDefaults.length === 0 ? (
          <p className="px-1 py-3 text-xs text-muted">Loading…</p>
        ) : visibleDefaults.length === 0 ? (
          <p className="rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3 text-xs text-muted">
            All default categories are hidden.
          </p>
        ) : (
          <div className="space-y-1 rounded-lg border border-glass-border bg-white/[0.02] p-1.5">
            {visibleDefaults.map((name) => (
              <div key={name} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2 text-sm text-paper/90">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorMap[name] }} />
                  {name}
                </span>
                <button
                  onClick={() => deleteCategory(name)}
                  title="Hide this default category"
                  className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Your categories</Label>
        {customCategories.length === 0 ? (
          <p className="rounded-lg border border-glass-border bg-white/[0.02] px-4 py-3 text-xs text-muted">
            You haven't added any custom categories yet — create one from a block's category picker.
          </p>
        ) : (
          <div className="space-y-1 rounded-lg border border-glass-border bg-white/[0.02] p-1.5">
            {customCategories.map((name) => (
              <div key={name} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-white/5 transition-colors">
                <span className="flex items-center gap-2 text-sm text-paper/90">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorMap[name] }} />
                  {name}
                </span>
                <button
                  onClick={() => deleteCategory(name)}
                  title="Delete category"
                  className="shrink-0 rounded p-1.5 text-muted transition-colors hover:bg-white/10 hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {hiddenCategories.length > 0 && (
        <div className="space-y-1.5">
          <Label className="normal-case text-muted">Hidden defaults</Label>
          <div className="flex flex-wrap gap-1.5">
            {hiddenCategories.map((name) => (
              <button
                key={name}
                onClick={() => restoreCategory(name)}
                title="Restore this category"
                className="flex items-center gap-1.5 rounded-full border border-glass-border bg-white/[0.03] px-2.5 py-1 text-xs text-muted transition-colors hover:bg-white/10 hover:text-paper"
              >
                <RotateCcw className="h-3 w-3" /> {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
