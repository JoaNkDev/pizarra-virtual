/**
 * Server-driven clear interval (minutes). Default 5.
 */
export const CLEAR_INTERVAL_MIN = (() => {
  const raw = process.env.NEXT_PUBLIC_CLEAR_INTERVAL_MINUTES;
  const n = raw ? Number(raw) : 5;
  return Number.isFinite(n) && n > 0 ? n : 5;
})();

export const CLEAR_INTERVAL_MS = CLEAR_INTERVAL_MIN * 60 * 1000;

// Logical canvas: shared coordinate space for all users. Strokes are
// normalized 0..1 against this, so each user can pan/zoom independently.
export const LOGICAL_W = 4000;
export const LOGICAL_H = 2500;

// Viewport zoom limits
export const MIN_SCALE = 0.25;
export const MAX_SCALE = 3;
