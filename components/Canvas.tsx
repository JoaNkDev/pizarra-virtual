"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import {
  drawSegment,
  newStrokeId,
  normFromEvent,
  redrawAll,
} from "@/lib/draw";
import type { Pt, Stroke, StrokeStartMsg } from "@/lib/types";
import { Throttle } from "@/lib/throttle";
import { LOGICAL_H, LOGICAL_W, MAX_SCALE, MIN_SCALE } from "@/lib/config";

export type Viewport = { tx: number; ty: number; scale: number };

export type CanvasHandle = {
  redraw: () => void;
  fit: () => void;
};

type Props = {
  strokes: Stroke[];
  myUserId: string;
  color: string;
  width: number;
  tool: "brush" | "eraser" | "pan";
  viewport: Viewport;
  onViewportChange: (v: Viewport) => void;
  onStrokeStart: (msg: StrokeStartMsg) => void;
  onStrokeExtend: (strokeId: string, point: Pt, userId: string) => void;
  onStrokeEnd: (strokeId: string, userId: string) => void;
  onEraseEnd: (strokeIds: string[]) => void;
};

type Pointer = {
  id: number;
  clientX: number;
  clientY: number;
  mode: "draw" | "pan";
  strokeId?: string;
};

export const Canvas = forwardRef<CanvasHandle, Props>(function Canvas(
  {
    strokes,
    myUserId,
    color,
    width,
    tool,
    viewport,
    onViewportChange,
    onStrokeStart,
    onStrokeExtend,
    onStrokeEnd,
    onEraseEnd,
  },
  ref
) {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const strokesRef = useRef<Stroke[]>(strokes);
  const colorRef = useRef(color);
  const widthRef = useRef(width);
  const toolRef = useRef(tool);
  const viewportRef = useRef<Viewport>(viewport);
  const pointersRef = useRef<Map<number, Pointer>>(new Map());
  const eraseStateRef = useRef<Map<number, { lastPx: number; lastPy: number; toDelete: Set<string> }>>(new Map());
  const lastDrawPtRef = useRef<Map<string, Pt>>(new Map());
  const panRef = useRef<{ cx: number; cy: number; tx: number; ty: number } | null>(null);
  const throttleRef = useRef(new Throttle(30));
  const [ready, setReady] = useState(false);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    strokesRef.current = strokes;
  }, [strokes]);
  useEffect(() => {
    colorRef.current = color;
  }, [color]);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);
  useEffect(() => {
    toolRef.current = tool;
    // When switching to pan, finalize any in-progress strokes
    if (tool === "pan") {
      for (const p of pointersRef.current.values()) {
        if (p.mode === "draw" && p.strokeId) {
          onStrokeEnd(p.strokeId, myUserId);
          lastDrawPtRef.current.delete(p.strokeId);
          p.strokeId = undefined;
          p.mode = "pan";
        }
      }
    }
  }, [tool, onStrokeEnd, myUserId]);
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = LOGICAL_W * dpr;
    canvas.height = LOGICAL_H * dpr;
    canvas.style.width = `${LOGICAL_W}px`;
    canvas.style.height = `${LOGICAL_H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxRef.current = ctx;
    redrawAll(ctx, strokesRef.current, LOGICAL_W, LOGICAL_H);
    setReady(true);
  }, []);

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [resize]);

  // Eraser cursor overlay: track pointer globally so the indicator follows
  // even when the cursor is stationary or moves slightly within a frame.
  useEffect(() => {
    if (tool !== "eraser") {
      setEraserCursor(null);
      return;
    }
    const onMove = (e: PointerEvent) => {
      setEraserCursor({ x: e.clientX, y: e.clientY });
    };
    const onLeave = () => setEraserCursor(null);
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [tool]);

  // Redraw on strokes change
  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx || !ready) return;
    redrawAll(ctx, strokesRef.current, LOGICAL_W, LOGICAL_H);
  }, [strokes, ready]);

  const fit = useCallback(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const rect = outer.getBoundingClientRect();
    // "fit" = scale 100%, centered in current viewport.
    const tx = (rect.width - LOGICAL_W) / 2;
    const ty = (rect.height - LOGICAL_H) / 2;
    onViewportChange({ tx, ty, scale: 1 });
  }, [onViewportChange]);

  useImperativeHandle(
    ref,
    () => ({
      redraw: () => {
        const ctx = ctxRef.current;
        if (!ctx) return;
        redrawAll(ctx, strokesRef.current, LOGICAL_W, LOGICAL_H);
      },
      fit,
    }),
    [fit]
  );

  function getCanvasPoint(
    e: { clientX: number; clientY: number },
    rect: DOMRect
  ): { pt: Pt; px: number; py: number } | null {
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    if (px < 0 || py < 0 || px > LOGICAL_W || py > LOGICAL_H) return null;
    const pt = normFromEvent(e, rect);
    return { pt, px, py };
  }

  function startPan(cx: number, cy: number) {
    panRef.current = {
      cx,
      cy,
      tx: viewportRef.current.tx,
      ty: viewportRef.current.ty,
    };
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0 && e.button !== 1) return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    const isPanTool = toolRef.current === "pan";
    const isMiddleClick = e.pointerType === "mouse" && e.button === 1;
    const isEraser = toolRef.current === "eraser";

    pointersRef.current.set(e.pointerId, {
      id: e.pointerId,
      clientX: e.clientX,
      clientY: e.clientY,
      mode: isPanTool || isMiddleClick ? "pan" : "draw",
    });

    const count = pointersRef.current.size;

    if (count >= 2) {
      // Switch everyone to pan, cancel any draws/erases
      for (const p of pointersRef.current.values()) {
        if (p.mode === "draw" && p.strokeId) {
          onStrokeEnd(p.strokeId, myUserId);
          lastDrawPtRef.current.delete(p.strokeId);
          p.strokeId = undefined;
        }
        if (eraseStateRef.current.has(p.id)) {
          const es = eraseStateRef.current.get(p.id)!;
          if (es.toDelete.size > 0) onEraseEnd(Array.from(es.toDelete));
          eraseStateRef.current.delete(p.id);
        }
        p.mode = "pan";
      }
      const ps = Array.from(pointersRef.current.values());
      const cx = ps.reduce((s, p) => s + p.clientX, 0) / ps.length;
      const cy = ps.reduce((s, p) => s + p.clientY, 0) / ps.length;
      startPan(cx, cy);
      return;
    }

    if (isPanTool || isMiddleClick) {
      startPan(e.clientX, e.clientY);
      return;
    }

    // Erase mode: track eraser path + strokes to delete
    if (isEraser) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cp = getCanvasPoint(e, rect);
      if (!cp) return;
      eraseStateRef.current.set(e.pointerId, {
        lastPx: cp.px,
        lastPy: cp.py,
        toDelete: new Set<string>(),
      });
      // Initial erase hit-test + paint preview
      eraseAt(cp.px, cp.py, e.pointerId);
      return;
    }

    // Draw mode, single pointer
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cp = getCanvasPoint(e, rect);
    if (!cp) return;
    const id = newStrokeId();
    const c = colorRef.current;
    const w = widthRef.current;
    const p = pointersRef.current.get(e.pointerId)!;
    p.strokeId = id;
    lastDrawPtRef.current.set(id, cp.pt);

    // Initial dot
    const ctx = ctxRef.current;
    if (ctx && ready) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(cp.px, cp.py, w / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    onStrokeStart({
      strokeId: id,
      userId: myUserId,
      color: c,
      width: w,
      point: cp.pt,
    });
  };

  /**
   * Erase at point (px, py) in logical pixels: paint white preview,
   * and mark any nearby strokes for deletion.
   */
  const eraseAt = (px: number, py: number, pointerId: number) => {
    const eraserRadius = widthRef.current / 2;
    const ctx = ctxRef.current;
    if (ctx && ready) {
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(px, py, eraserRadius, 0, Math.PI * 2);
      ctx.fill();
    }
    const es = eraseStateRef.current.get(pointerId);
    if (!es) return;
    const r2 = eraserRadius * eraserRadius;
    for (const s of strokesRef.current) {
      if (es.toDelete.has(s.id)) continue;
      for (const [nx, ny] of s.points) {
        const sx = nx * LOGICAL_W;
        const sy = ny * LOGICAL_H;
        const dx = sx - px;
        const dy = sy - py;
        if (dx * dx + dy * dy <= r2) {
          es.toDelete.add(s.id);
          break;
        }
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    p.clientX = e.clientX;
    p.clientY = e.clientY;

    // Eraser move: paint preview + hit-test
    if (eraseStateRef.current.has(e.pointerId)) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const cp = getCanvasPoint(e, rect);
      if (!cp) return;
      const es = eraseStateRef.current.get(e.pointerId)!;
      const ctx = ctxRef.current;
      if (ctx && ready) {
        drawSegment(
          ctx,
          [es.lastPx, es.lastPy],
          [cp.px, cp.py],
          "#ffffff",
          widthRef.current,
          LOGICAL_W,
          LOGICAL_H
        );
      }
      es.lastPx = cp.px;
      es.lastPy = cp.py;
      eraseAt(cp.px, cp.py, e.pointerId);
      return;
    }

    if (p.mode === "pan") {
      const start = panRef.current;
      if (!start) return;
      let cx: number, cy: number;
      if (pointersRef.current.size === 1) {
        cx = e.clientX;
        cy = e.clientY;
      } else {
        const ps = Array.from(pointersRef.current.values());
        cx = ps.reduce((s, q) => s + q.clientX, 0) / ps.length;
        cy = ps.reduce((s, q) => s + q.clientY, 0) / ps.length;
      }
      const dx = cx - start.cx;
      const dy = cy - start.cy;
      onViewportChange({
        tx: start.tx + dx,
        ty: start.ty + dy,
        scale: viewportRef.current.scale,
      });
      return;
    }

    // Draw
    if (!p.strokeId) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cp = getCanvasPoint(e, rect);
    if (!cp) return;

    const last = lastDrawPtRef.current.get(p.strokeId);
    if (last) {
      const ctx = ctxRef.current;
      if (ctx && ready) {
        const [px0, py0] = denormLocal(last);
        drawSegment(
          ctx,
          [px0, py0],
          [cp.px, cp.py],
          colorRef.current,
          widthRef.current,
          LOGICAL_W,
          LOGICAL_H
        );
      }
    }
    lastDrawPtRef.current.set(p.strokeId, cp.pt);
    throttleRef.current.schedule(() => {
      onStrokeExtend(p.strokeId!, cp.pt, myUserId);
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointersRef.current.get(e.pointerId);
    if (!p) return;
    // Eraser finalize
    const es = eraseStateRef.current.get(e.pointerId);
    if (es) {
      if (es.toDelete.size > 0) onEraseEnd(Array.from(es.toDelete));
      eraseStateRef.current.delete(e.pointerId);
    } else if (p.mode === "draw" && p.strokeId) {
      onStrokeEnd(p.strokeId, myUserId);
      lastDrawPtRef.current.delete(p.strokeId);
    }
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      panRef.current = null;
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const v = viewportRef.current;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
    if (newScale === v.scale) return;
    const ratio = newScale / v.scale;
    const newTx = e.clientX - (e.clientX - v.tx) * ratio;
    const newTy = e.clientY - (e.clientY - v.ty) * ratio;
    onViewportChange({ tx: newTx, ty: newTy, scale: newScale });
  };

  return (
    <div
      ref={outerRef}
      className="absolute inset-0 overflow-hidden bg-bg select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
    >
      <div
        className="absolute top-0 left-0 canvas-bg"
        style={{
          width: LOGICAL_W,
          height: LOGICAL_H,
          transform: `translate(${viewport.tx}px, ${viewport.ty}px) scale(${viewport.scale})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        <canvas ref={canvasRef} className="block" />
      </div>
      {eraserCursor && (
        <div
          aria-hidden
          className="pointer-events-none fixed rounded-full border-2 border-accent bg-white/40"
          style={{
            left: eraserCursor.x - width / 2,
            top: eraserCursor.y - width / 2,
            width: width,
            height: width,
            zIndex: 20,
            transition: "none",
          }}
        />
      )}
    </div>
  );
});

function denormLocal(pt: Pt): [number, number] {
  return [pt[0] * LOGICAL_W, pt[1] * LOGICAL_H];
}
