# Flow - Focus Blocks

A Pomodoro application built around the concept of Focus Blocks. 
Flow allows users to set a total time goal and automatically divides it into focus and break cycles. It synchronizes the plan and live timer state seamlessly to Supabase, enabling real-time edits, even mid-session, across any device.

## Live Demo

**Vercel Deployment:** [Flow App on Vercel](https://flow-livin.vercel.app/) 

## Key Features

*   **Dynamic Focus Blocks:** Instead of rigid individual timers, users create "Blocks" of time. The algorithm automatically chunks the block into focus segments, short breaks, and long breaks based on user preferences.
*   **Custom Ambient Sounds & YouTube Integration:** Enhance your focus with ambient audio. The app supports playing custom YouTube links directly as background soundscapes, saving your favorite ambient links, and generating procedural audio using the Web Audio API (e.g., filtered noise for rain or white noise).
*   **Picture-in-Picture (PiP) Mini Timer:** Keep track of your focus sessions without keeping the main tab open. The app includes a floating Picture-in-Picture mini timer that stays on top of your other windows.
*   **Advanced Analytics & Manual Entry:** Track your productivity over time with detailed Weekly and Monthly charts. Missed a session? The app allows for manual time entry to keep your logs accurate.
*   **Task Categories:** Organize your focus blocks and tasks into custom categories to better understand where your time is going.
*   **Block Queuing:** A queue system allows you to line up multiple blocks of work for continuous, planned deep work sessions.
*   **Real-time Synchronization:** Powered by Supabase Realtime, timers and tasks sync instantly across multiple devices. Start a timer on your laptop, and watch it tick down on your phone without refreshing.
*   **Interactive Block Ring & Timeline Strip:** Signature visual components that display a ring sliced into arcs. Each arc is sized proportionally to the actual duration of the segment, providing a clear visual plan for the block. The timeline strip offers a linear view of your session.
*   **Mid-Session Editing:** Users can edit tasks, skip segments, or modify the plan while the timer is actively running, with the state seamlessly resolving across the network.
*   **Strict Mode Protection:** Implements guards against accidental tab closure or navigation mid-session to prevent data loss or interrupted focus.
*   **Modern Aesthetics:** A sleek, responsive dark-mode UI built with Tailwind CSS, Framer Motion for micro-interactions, and a custom color palette emphasizing deep ink backgrounds, amber for focus, and teal for rest.

## Technology Stack

*   **Frontend Framework:** React 19, Vite, TypeScript
*   **State Management:** Zustand (for both local UI state and synced Supabase state)
*   **Styling:** Tailwind CSS, class-variance-authority, tailwind-merge
*   **Components:** Radix UI primitives, custom UI components, Lucide React icons
*   **Animations:** Framer Motion
*   **Backend & Database:** Supabase (PostgreSQL, Authentication, Realtime, Row Level Security)
*   **Analytics:** Vercel Analytics

## System Architecture

The application is structured into several core functional domains:

*   **Session Calculator (`src/lib/sessionCalculator.ts`):** 
    A pure function algorithm that takes total time, focus length, break length, and long-break rules, and outputs an ordered list of segments. Used for both live preview during block creation and materializing database rows upon saving.
*   **Blocks & Categories Stores (`src/store/useBlocksStore.ts`, `src/store/useCategoriesStore.ts`):** 
    Handles all CRUD operations against Supabase (blocks, segments, tasks, session logs, categories). Applies local-first runtime patches to ensure the UI feels instantaneous while persisting data in the background. Manages Postgres Realtime subscriptions to sync cross-device state seamlessly.
*   **Timer & PiP Stores (`src/store/useTimerStore.ts`, `src/store/usePipStore.ts`):** 
    The core ticking engine. Driven by a single `setInterval`, it manages the active block, auto-advances segments, logs completions, syncs progress to Supabase every 5 seconds, and controls the floating Picture-in-Picture window.
*   **Ambient Audio Stores (`src/store/useAmbientPlayerStore.ts`, `src/store/useAmbientLinksStore.ts`):** 
    Manages custom YouTube URLs, saved ambient links, and the state of the background audio player.
*   **Profile Store (`src/store/useProfileStore.ts`):** 
    Manages user preferences, reading and writing default focus/break ratios from the `profiles` table.

## Setup and Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd pomodoro-flow
npm install
```

### 2. Supabase Configuration

1.  Create a new project at [supabase.com](https://supabase.com).
2.  Navigate to the **SQL Editor** in your Supabase dashboard.
3.  Execute the contents of `supabase/schema.sql`. This script provisions:
    *   Tables: `profiles`, `focus_blocks`, `block_segments`, `tasks`, `focus_sessions`, `categories`, `ambient_links` (and any others in the schema).
    *   Row Level Security (RLS) policies ensuring data isolation (scoped to `auth.uid()`).
    *   A database trigger that automatically creates a `profiles` row upon user signup.
    *   Realtime publication settings for `focus_blocks`, `block_segments`, and `tasks`.
4.  For seamless local development, you may want to disable email confirmation in **Authentication -> Providers -> Email**.
5.  In **Project Settings -> API**, copy your **Project URL** and **anon public key**.

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Populate `.env.local` with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

### 4. Development Server

Start the Vite development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`. You can create an account using email/password. To test realtime syncing, open a second browser window or a mobile device, log in with the same credentials, and start a timer.

## Building and Deployment

To create an optimized production build:

```bash
npm run build
```

This compiles TypeScript and bundles the application into the `dist/` directory.

## Security Notes

*   **Row Level Security (RLS):** All database interactions are protected by Postgres RLS. Users can strictly only read, update, and delete their own data.
*   **Database Types:** `src/types/database.ts` acts as a mirror for the SQL schema. Once your project is linked to the Supabase CLI, you can replace it with a generated version by running `npx supabase gen types typescript --linked`.
