/**
 * Fixed, full-viewport field of slow-drifting colour blobs sitting behind the
 * whole app. Every glass surface (cards, dialogs, header, buttons) reads its
 * blur against this — the blur is doing real optical work here, not standing
 * in as decoration on a flat background.
 */
export function LiquidBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-ink">
      <div className="absolute -left-[10%] -top-[15%] h-[560px] w-[560px] rounded-full bg-focus/25 blur-[120px] animate-blob-drift-1" />
      <div className="absolute -right-[12%] top-[28%] h-[520px] w-[520px] rounded-full bg-rest/20 blur-[130px] animate-blob-drift-2" />
      <div className="absolute -bottom-[20%] left-[20%] h-[600px] w-[600px] rounded-full bg-focus/10 blur-[140px] animate-blob-drift-3" />
      <div className="absolute bottom-[5%] right-[15%] h-[380px] w-[380px] rounded-full bg-rest/15 blur-[110px] animate-blob-drift-1" />
      {/* Faint grain-free scrim keeps text contrast steady over the brightest blob overlaps. */}
      <div className="absolute inset-0 bg-ink/35" />
    </div>
  );
}
