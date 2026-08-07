import { useEffect, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SliderWithInputProps {
  min: number;
  max: number;
  step: number;
  value: number;
  onValueChange: (value: number) => void;
  /** Suffix shown inside the number field, e.g. "m". */
  unit?: string;
  inputClassName?: string;
}

/** A slider paired with a manual number input for the same value, kept in sync both ways. */
export function SliderWithInput({ min, max, step, value, onValueChange, unit = "m", inputClassName }: SliderWithInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    const parsed = Number(raw);
    if (raw.trim() === "" || Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    // Typing a value is exact — only clamp to the allowed range, don't snap to
    // the slider's step (that would silently round e.g. 23 up to 25).
    const clamped = Math.min(max, Math.max(min, Math.round(parsed)));
    onValueChange(clamped);
    setText(String(clamped));
  };

  return (
    <div className="flex items-center gap-3">
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => {
          onValueChange(v);
          setText(String(v));
        }}
        className="flex-1"
      />
      <div className="relative w-20 shrink-0">
        <Input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          step={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          className={cn("h-8 px-2 pr-6 text-right text-sm tabular", inputClassName)}
        />
        {unit && (
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}
