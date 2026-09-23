"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, type CanvasHandle } from "@/components/Canvas";
import { Toolbar } from "@/components/Toolbar";
import { SetupBanner } from "@/components/SetupBanner";
import { SchemaBanner } from "@/components/SchemaBanner";
import { useWhiteboard } from "@/lib/useWhiteboard";
import { useUserId } from "@/lib/useUserId";
import { supabase } from "@/lib/supabase";
import { COLORS, type Color, type Pt, type Stroke } from "@/lib/types";
import { MAX_SCALE, MIN_SCALE } from "@/lib/config";
import { EVT } from "@/lib/supabase";
import type { Viewport } from "@/components/Canvas";

const STROKE_LIMIT = 1500;

export default function Home() {
  const userId = useUserId();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [color, setColor] = useState<Color>(COLORS[2]);
  const [width, setWidth] = useState(8);
  const [tool, setTool] = useState<"brush" | "eraser" | "pan">("brush");
  const [viewport, setViewport] = useState<Viewport>(() => ({
    tx: 0,
    ty: 0,
    scale: 1,
  }));
  const [schemaError, setSchemaError] = useState(false);
  const myStrokesRef = useRef<Set<string>>(new Set());

  const canvasRef = useRef<CanvasHandle | null>(null);

  const handleIncoming = useCallback((payload: unknown) => {
    if (!payload || typeof payload !== "object") return;
    const msg = payload as { event?: string; payload?: unknown };
    const data = msg.payload as Record<string, unknown> | undefined;
    if (!data) return;
    const ev = msg.event;
    switch (ev) {
      case EVT.STROKE_START: {
        const s = data as unknown as {
          strokeId: string;
          userId: string;
          color: string;
          width: number;
          point: Pt;
        };
        setStrokes((prev) => {
          if (prev.some((x) => x.id === s.strokeId)) return prev;
          const next: Stroke = {
            id: s.strokeId,
            userId: s.userId,
            color: s.color,
            width: s.width,
            points: [s.point],
            createdAt: Date.now(),
          };
          return appendCap(next, prev);
        });
        break;
      }
      case EVT.STROKE_EXTEND: {
        const e = data as unknown as {
          strokeId: string;
          userId: string;
          point: Pt;
        };
        setStrokes((prev) =>
          prev.map((s) =>
            s.id === e.strokeId ? { ...s, points: [...s.points, e.point] } : s
          )
        );
        break;
      }
      case EVT.STROKE_END: {
        const e = data as unknown as { strokeId: string; userId: string };
        setStrokes((prev) => {
          const s = prev.find((x) => x.id === e.strokeId);
          if (s) void persistStroke(s);
          return prev;
        });
        break;
      }
      case EVT.UNDO: {
        // Only honor undo for own strokes — protects other users' work.
        const u = data as unknown as { userId: string; strokeId: string };
        if (u.userId !== userId) return;
        setStrokes((prev) => prev.filter((s) => s.id !== u.strokeId));
        myStrokesRef.current.delete(u.strokeId);
        void supDeleteStroke(u.strokeId);
        break;
      }
      case EVT.SYNC_REQUEST: {
        const req = data as unknown as { userId: string };
        void supabaseFetchCurrent().then((payload) => {
          if (!payload) return;
          wbApiRef.current?.syncResponse({
            userId: req.userId,
            strokes: payload.strokes,
          });
        });
        break;
      }
      case EVT.SYNC_RESPONSE: {
        const resp = data as unknown as {
          userId: string;
          strokes: Stroke[];
        };
        if (Array.isArray(resp.strokes) && resp.strokes.length > 0) {
          setStrokes((prev) => {
            const map = new Map<string, Stroke>();
            for (const s of prev) map.set(s.id, s);
            for (const s of resp.strokes) {
              if (!map.has(s.id)) map.set(s.id, s);
            }
            return Array.from(map.values())
              .sort((a, b) => a.createdAt - b.createdAt)
              .slice(-STROKE_LIMIT);
          });
        }
        break;
      }
    }
  }, [userId]);

  const wbApi = useWhiteboard(userId, handleIncoming);
  const wbApiRef = useRef(wbApi);
  wbApiRef.current = wbApi;

  // Load existing strokes from Supabase on mount
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    void (async () => {
      const { data: dbStrokes, error: e1 } = await supabase
        .from("whiteboard_strokes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(STROKE_LIMIT);
      if (cancelled) return;
      if (
        e1?.code === "PGRST116" ||
        /relation.*does not exist/i.test(String(e1?.message ?? ""))
      ) {
        setSchemaError(true);
        return;
      }
      if (!e1 && dbStrokes) {
        const mapped: Stroke[] = dbStrokes
          .map((r) => ({
            id: r.id as string,
            userId: r.user_id as string,
            color: r.color as string,
            width: r.width as number,
            points: ((r.points as unknown) as number[][]).map((p): Pt => [
              p[0],
              p[1],
            ]),
            createdAt: new Date(r.created_at as string).getTime(),
          }))
          .reverse();
        setStrokes(mapped);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveColor = useMemo(
    () => (tool === "eraser" ? "#ffffff" : color),
    [tool, color]
  );

  const handleStrokeStart = useCallback(
    (m: {
      strokeId: string;
      userId: string;
      color: string;
      width: number;
      point: Pt;
    }) => {
      wbApi.strokeStart(m);
      myStrokesRef.current.add(m.strokeId);
      setStrokes((prev) => {
        if (prev.some((s) => s.id === m.strokeId)) return prev;
        const ns: Stroke = {
          id: m.strokeId,
          userId: m.userId,
          color: m.color,
          width: m.width,
          points: [m.point],
          createdAt: Date.now(),
        };
        return appendCap(ns, prev);
      });
    },
    [wbApi]
  );
  const handleStrokeExtend = useCallback(
    (strokeId: string, point: Pt, user: string) => {
      wbApi.strokeExtend({ strokeId, userId: user, point });
      if (user === userId) {
        setStrokes((prev) =>
          prev.map((s) =>
            s.id === strokeId ? { ...s, points: [...s.points, point] } : s
          )
        );
      }
    },
    [wbApi, userId]
  );
  const handleStrokeEnd = useCallback(
    (strokeId: string, user: string) => {
      wbApi.strokeEnd({ strokeId, userId: user });
      if (user === userId) {
        setStrokes((prev) => {
          const s = prev.find((x) => x.id === strokeId);
          if (s) void persistStroke(s);
          return prev;
        });
      }
    },
    [wbApi, userId]
  );

  // Undo only your own last stroke
  const lastOwnStroke = useMemo(() => {
    for (let i = strokes.length - 1; i >= 0; i--) {
      if (strokes[i].userId === userId) return strokes[i];
    }
    return null;
  }, [strokes, userId]);

  const handleUndo = useCallback(() => {
    if (!lastOwnStroke) return;
    wbApi.undo({ userId, strokeId: lastOwnStroke.id });
  }, [wbApi, userId, lastOwnStroke]);

  const zoomBy = useCallback((factor: number) => {
    setViewport((v) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, v.scale * factor));
      if (newScale === v.scale) return v;
      return { tx: v.tx, ty: v.ty, scale: newScale };
    });
  }, []);

  const handleZoomIn = useCallback(() => zoomBy(1.2), [zoomBy]);
  const handleZoomOut = useCallback(() => zoomBy(1 / 1.2), [zoomBy]);
  const handleFit = useCallback(() => {
    canvasRef.current?.fit();
  }, []);

  const handleDownload = useCallback(() => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `pizarra-${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-")}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  if (!wbApi.isConfigured) {
    return (
      <SetupBanner
        url={process.env.NEXT_PUBLIC_SUPABASE_URL}
        key={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : ""}
      />
    );
  }

  if (schemaError) {
    return <SchemaBanner />;
  }

  return (
    <main className="relative h-full w-full">
      <div
        className="absolute inset-0 pb-[140px] md:pb-0 md:pt-[124px]"
        aria-label="Pizarra"
      >
        <Canvas
          ref={canvasRef}
          strokes={strokes}
          myUserId={userId}
          color={effectiveColor}
          width={width}
          tool={tool}
          viewport={viewport}
          onViewportChange={setViewport}
          onStrokeStart={handleStrokeStart}
          onStrokeExtend={handleStrokeExtend}
          onStrokeEnd={handleStrokeEnd}
        />
      </div>

      <Toolbar
        color={color}
        width={width}
        tool={tool}
        canUndo={Boolean(lastOwnStroke)}
        peersCount={wbApi.peersCount}
        connected={wbApi.connected}
        viewport={viewport}
        onColor={setColor}
        onWidth={setWidth}
        onTool={setTool}
        onUndo={handleUndo}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFit={handleFit}
        onDownload={handleDownload}
      />
    </main>
  );
}

function appendCap(newStroke: Stroke | null, list: Stroke[]): Stroke[] {
  if (!newStroke) return list.slice(-STROKE_LIMIT);
  const next = [...list, newStroke];
  return next.length > STROKE_LIMIT ? next.slice(-STROKE_LIMIT) : next;
}

async function persistStroke(s: Stroke) {
  if (!supabase) return;
  void supabase.from("whiteboard_strokes").insert({
    id: s.id,
    user_id: s.userId,
    color: s.color,
    width: s.width,
    points: s.points,
  });
}

async function supDeleteStroke(id: string) {
  if (!supabase) return;
  void supabase.from("whiteboard_strokes").delete().eq("id", id);
}

async function supabaseFetchCurrent(): Promise<{ strokes: Stroke[] } | null> {
  if (!supabase) return null;
  const { data: dbStrokes } = await supabase
    .from("whiteboard_strokes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(STROKE_LIMIT);
  const strokes: Stroke[] = (dbStrokes ?? [])
    .map((r) => ({
      id: r.id as string,
      userId: r.user_id as string,
      color: r.color as string,
      width: r.width as number,
      points: r.points as Pt[],
      createdAt: new Date(r.created_at as string).getTime(),
    }))
    .reverse();
  return { strokes };
}
