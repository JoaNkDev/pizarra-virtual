/**
 * Canvas drawing helpers. Pure functions, no React.
 */

import type { Pt, Stroke } from "./types";

export function setupCanvas(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
} {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.floor(rect.width));
  const height = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, width, height, dpr };
}

export function clearCanvas(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.clearRect(0, 0, w, h);
}

/**
 * Normalized coord (0..1) → device px.
 */
export function denorm(pt: Pt, w: number, h: number): [number, number] {
  return [pt[0] * w, pt[1] * h];
}

/**
 * Pointer event coords → normalized.
 */
export function normFromEvent(
  e: { clientX: number; clientY: number },
  rect: DOMRect
): Pt {
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;
  return [
    Math.min(1, Math.max(0, x)),
    Math.min(1, Math.max(0, y)),
  ];
}

/**
 * Draw a single stroke segment from p0 to p1 (in normalized space).
 * Uses round caps and smooths with quadratic midpoints.
 */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  p0: Pt,
  p1: Pt,
  color: string,
  width: number,
  w: number,
  h: number
) {
  const [x0, y0] = denorm(p0, w, h);
  const [x1, y1] = denorm(p1, w, h);
  ctx.strokeStyle = color;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
}

export function redrawAll(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  w: number,
  h: number
) {
  clearCanvas(ctx, w, h);
  for (const s of strokes) {
    if (s.points.length === 0) continue;
    if (s.points.length === 1) {
      // Single dot
      const [px, py] = denorm(s.points[0], w, h);
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(px, py, s.width / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.strokeStyle = s.color;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = s.width;
    ctx.beginPath();
    let [px, py] = denorm(s.points[0], w, h);
    ctx.moveTo(px, py);
    for (let i = 1; i < s.points.length; i++) {
      const [nx, ny] = denorm(s.points[i], w, h);
      const mx = (px + nx) / 2;
      const my = (py + ny) / 2;
      ctx.quadraticCurveTo(px, py, mx, my);
      px = nx;
      py = ny;
    }
    ctx.lineTo(px, py);
    ctx.stroke();
  }
}

export function newStrokeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}