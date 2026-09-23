/**
 * Stroke model.
 * Coordinates are normalized 0..1 against the canvas drawing buffer size
 * so strokes render identically across devices with different DPRs/sizes.
 */

export type Pt = [number, number];

export type Stroke = {
  id: string;
  userId: string;
  color: string;
  width: number; // px in drawing-buffer units
  points: Pt[]; // normalized
  createdAt: number; // ms epoch
};

export type StrokeStartMsg = {
  strokeId: string;
  userId: string;
  color: string;
  width: number;
  point: Pt;
};

export type StrokeExtendMsg = {
  strokeId: string;
  userId: string;
  point: Pt;
};

export type StrokeEndMsg = {
  strokeId: string;
  userId: string;
};

export type UndoMsg = {
  userId: string;
  strokeId: string;
};

export type TimerMsg = {
  endsAt: number; // ms epoch
  startedBy: string;
};

export type PresenceMsg = {
  userId: string;
  joined: boolean;
};

export type SyncRequestMsg = {
  userId: string;
};

export type SyncResponseMsg = {
  userId: string;
  strokes: Stroke[];
};

export const COLORS = [
  "#ffffff", // white
  "#0f1115", // near-black
  "#7c5cff", // accent purple
  "#ff5c8a", // pink
  "#ffd35c", // yellow
  "#5cffb1", // mint
  "#5cc8ff", // sky
  "#ff6f3c", // orange
] as const;

export type Color = (typeof COLORS)[number];