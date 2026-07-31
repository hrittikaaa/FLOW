# Flow — Focus Blocks

A Pomodoro app built around **Focus Blocks**: set a total time goal, and Flow
divides it into focus/break cycles automatically, syncs the plan and live
timer state to Supabase, and lets you edit everything — even mid-session —
from any device.

## Stack

React + Vite + TypeScript · Supabase (Postgres + Auth) · Tailwind CSS ·
shadcn-style components on Radix primitives · Framer Motion · Zustand

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project.
2. Open the **SQL Editor** and run the entire contents of
   [`supabase/schema.sql`](./supabase/schema.sql). This creates:
   - `profiles`, `focus_blocks`, `block_segments`, `tasks`, `focus_sessions`
   - Row Level Security policies scoped to `auth.uid()` on every table
   - A trigger that auto-creates a `profiles` row on signup
   - Realtime publication for `focus_blocks`, `block_segments`, `tasks`
3. In **Project Settings → API**, copy your **Project URL** and **anon public key**.
4. By default new Supabase projects require email confirmation. For local
   testing you can turn this off under **Authentication → Providers → Email**.

## 3. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

## 4. Run it

```bash
npm run dev
```

Sign up with an email/password on the screen that appears — that's it, your
account and first blocks are ready to go. Open the same URL on your phone
and sign in with the same account to see everything sync.

## 5. Build for production

```bash
npm run build
```

Outputs to `dist/`. Deploy it anywhere that serves static files (Vercel,
Netlify, Cloudflare Pages, etc.) and set the two `VITE_SUPABASE_*` env vars
in that platform's dashboard.

## How the pieces fit together

- **`src/lib/sessionCalculator.ts`** — the Dynamic Block algorithm. Pure
  function: `(total time, focus length, break length, long-break rules) →
  ordered list of segments`. Used for the live preview while creating a
  block, and to materialize the real `block_segments` rows on save.
- **`src/store/useBlocksStore.ts`** — all CRUD against Supabase (blocks,
  segments, tasks, session log), plus local-first runtime patches so the
  timer feels instant while still persisting. Also subscribes to Postgres
  Realtime on `focus_blocks`/`tasks` (via `subscribeRealtime()`) so a block
  started on your laptop updates live on your phone — no refresh needed.
  A short self-echo window prevents that subscription from fighting with
  this device's own per-second local ticking.
- **`src/store/useProfileStore.ts`** — reads/writes your default
  focus/break/long-break ratio from the `profiles` table (gear icon in the
  header). New blocks pre-fill from these defaults; each block can still
  override its own ratio.
- **`src/store/useTimerStore.ts`** — the ticking engine. One `setInterval`
  drives the active block, auto-advances through segments, logs completed
  segments to `focus_sessions` for analytics, and syncs progress to
  Supabase every 5 seconds (and on pause/skip/stop) so you can pick up the
  same block from another device mid-session.
- **`src/components/timer/BlockRing.tsx`** — the signature visual: a ring
  sliced into arcs sized by each segment's actual duration, so the shape of
  the ring always reflects your real plan for the block.
- **Strict mode** (`useStrictModeGuard`) warns before you close/refresh the
  tab mid-session and disables edit/delete affordances on the running block
  elsewhere in the UI. A page can't block switching tabs outright — that's
  a browser sandbox limit, not something any web app can override.
- **Ambient soundscapes** are generated procedurally with the Web Audio API
  (filtered noise for rain/lo-fi/white noise) rather than bundled audio
  files, so there's nothing to host or license.

## Notes

- `src/types/database.ts` is a hand-written mirror of the SQL schema. Once
  your project is linked to the Supabase CLI, you can replace it with a
  generated version: `npx supabase gen types typescript --linked`.
- Row Level Security means all of this is safe to ship as-is — a signed-in
  user can only ever read or write their own rows.
