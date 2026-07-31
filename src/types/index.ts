export type SegmentKind = "focus" | "break" | "long_break";
export type BlockStatus = "planned" | "active" | "paused" | "completed" | "archived";
export type AmbientSound = "none" | "rain" | "white-noise" | "lofi";

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
  ambientSound: AmbientSound;
  status: BlockStatus;
  currentSegmentIndex: number;
  elapsedSecondsInSegment: number;
  lastStartedAt: string | null;
  completedMinutes: number;
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
  ambientSound: AmbientSound;
  taskTitles: string[];
}
