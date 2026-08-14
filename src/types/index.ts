export type SegmentKind = "focus" | "break" | "long_break";
export type BlockStatus = "planned" | "active" | "paused" | "completed" | "archived";

export interface SegmentPlan {
  position: number;
  kind: SegmentKind;
  durationMinutes: number;
}

export interface BlockSegment extends SegmentPlan {
  id: string;
  blockId: string;
  isCompleted: boolean;
  startedAt: string | null;
  completedAt: string | null;
}

export interface Task {
  id: string;
  blockId: string;
  userId: string;
  title: string;
  isDone: boolean;
  position: number;
  rolledOverFrom: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface FocusBlock {
  id: string;
  userId: string;
  name: string;
  category: string;
  totalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  strictMode: boolean;
  /** Pasted YouTube (or YouTube Music) video/playlist link played during focus segments; null = no ambient audio. */
  ambientYoutubeUrl: string | null;
  /** 0-100 */
  ambientVolume: number;
  status: BlockStatus;
  currentSegmentIndex: number;
  elapsedSecondsInSegment: number;
  lastStartedAt: string | null;
  completedMinutes: number;
  /** 0-based position in the user's "queue" of blocks to run back-to-back; null when not queued. */
  queuePosition: number | null;
  createdAt: string;
  updatedAt: string;
  segments: BlockSegment[];
  tasks: Task[];
}

export interface FocusSession {
  id: string;
  userId: string;
  blockId: string | null;
  blockName: string;
  category: string;
  kind: SegmentKind;
  durationMinutes: number;
  occurredAt: string;
}

/** Shape used when creating/editing a block via the form. */
export interface BlockDraft {
  name: string;
  category: string;
  totalMinutes: number;
  focusMinutes: number;
  breakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  strictMode: boolean;
  ambientYoutubeUrl: string | null;
  ambientVolume: number;
  taskTitles: string[];
}

/** A user-saved YouTube/YouTube Music link, reusable across blocks' ambient audio. */
export interface SavedAmbientLink {
  id: string;
  userId: string;
  label: string;
  url: string;
  createdAt: string;
}
