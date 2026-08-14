import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COMMON_CATEGORIES, useCategoriesStore } from "@/store/useCategoriesStore";
import { buildColorMap } from "@/components/analytics/analyticsUtils";

interface CategorySelectProps {
  id?: string;
  value: string;
  onChange: (category: string) => void;
}

const ADD_NEW_SENTINEL = "__add_new__";

/** A category picker that offers the built-in common categories plus any the
 *  user has added themselves, with an "Add new category…" row baked into
 *  the dropdown itself, and a color swatch per category for quick recognition
 *  (matching the colors used in the analytics charts). */
export function CategorySelect({ id = "category", value, onChange }: CategorySelectProps) {
  const { customCategories, fetchCategories, addCategory } = useCategoriesStore();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (adding) inputRef.current?.focus();
  }, [adding]);

  const options = Array.from(new Set([...COMMON_CATEGORIES, ...customCategories, value].filter(Boolean)));
  const colorMap = buildColorMap(options);

  const commitNew = async () => {
    if (!newName.trim() || saving) return;
    setSaving(true);
    setError(null);
    const created = await addCategory(newName);
    setSaving(false);
    if (created) {
      onChange(created);
      setNewName("");
      setAdding(false);
    } else {
      setError("Couldn't add that category. Give it another try.");
    }
  };

  if (adding) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor={id}>Category</Label>
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            id={id}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitNew();
              }
              if (e.key === "Escape") {
                setAdding(false);
                setNewName("");
                setError(null);
              }
            }}
            placeholder="New category name"
          />
          <button
            type="button"
            onClick={commitNew}
            disabled={!newName.trim() || saving}
            className="shrink-0 rounded-lg border border-focus/40 bg-focus/10 px-3 text-sm text-focus transition-colors hover:bg-focus/20 disabled:opacity-40"
          >
            {saving ? "Adding…" : "Add"}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false);
              setNewName("");
              setError(null);
            }}
            className="shrink-0 rounded-lg px-2 text-sm text-muted hover:text-paper"
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Category</Label>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v === ADD_NEW_SENTINEL) {
            setAdding(true);
            return;
          }
          onChange(v);
        }}
      >
        <SelectTrigger id={id}>
          <SelectValue placeholder="Select a category">
            <span className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: colorMap[value] ?? "#8B8AFF" }}
              />
              {value}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((c) => (
            <SelectItem key={c} value={c}>
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: colorMap[c] }} />
                {c}
              </span>
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={ADD_NEW_SENTINEL} className="text-focus data-[highlighted]:text-focus">
            <span className="flex items-center gap-2">
              <Plus size={13} /> Add new category…
            </span>
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
