"use client";

import { COLORS, type Color } from "@/lib/types";
import type { Viewport } from "./Canvas";

type Props = {
  color: Color | string;
  width: number;
  tool: "brush" | "eraser" | "pan";
  canUndo: boolean;
  peersCount: number;
  connected: boolean;
  viewport: Viewport;
  onColor: (c: Color) => void;
  onWidth: (w: number) => void;
  onTool: (t: "brush" | "eraser" | "pan") => void;
  onUndo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onDownload: () => void;
};

export function Toolbar({
  color,
  width,
  tool,
  canUndo,
  peersCount,
  connected,
  viewport,
  onColor,
  onWidth,
  onTool,
  onUndo,
  onZoomIn,
  onZoomOut,
  onFit,
  onDownload,
}: Props) {
  const zoomPct = Math.round(viewport.scale * 100);

  return (
    <div
      className="
        fixed inset-x-0 bottom-0 z-30
        border-t border-border bg-panel/95 backdrop-blur
        safe-bottom
        px-3 py-2
        flex flex-col gap-2
        md:top-0 md:bottom-auto md:border-t-0 md:border-b md:safe-top
      "
    >
      {/* Status row */}
      <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-white/60">
        <div className="flex items-center gap-2">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-400" : "bg-rose-400"
            }`}
            aria-label={connected ? "conectado" : "desconectado"}
          />
          <span>{connected ? "en vivo" : "conectando…"}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="tabular-nums">{zoomPct}%</span>
          <button
            type="button"
            onClick={onFit}
            className="rounded bg-white/5 px-1.5 py-0.5 hover:bg-white/10"
            title="Ajustar vista"
          >
            fit
          </button>
        </div>
        <div>
          {peersCount} {peersCount === 1 ? "persona" : "personas"}
        </div>
      </div>

      {/* Tools row */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onTool("brush")}
          aria-pressed={tool === "brush"}
          className={btnCls(tool === "brush")}
          title="Pincel"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 20h4l10-10-4-4L4 16v4z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M14 6l4 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onTool("eraser")}
          aria-pressed={tool === "eraser"}
          className={btnCls(tool === "eraser")}
          title="Borrador"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M16 4l4 4-9 9H7v-4l9-9z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d="M3 20h18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => onTool("pan")}
          aria-pressed={tool === "pan"}
          className={btnCls(tool === "pan")}
          title="Mover (pan)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 11V6a2 2 0 1 1 4 0v5m0 0V4a2 2 0 1 1 4 0v7m0 0V6a2 2 0 1 1 4 0v8a7 7 0 0 1-7 7H8a5 5 0 0 1-5-5v-1l3 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <div className="mx-1 h-7 w-px bg-border" />
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          className={
            btnCls(false) + " disabled:opacity-40 disabled:cursor-not-allowed"
          }
          title="Deshacer mi último trazo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M9 14L4 9l5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M4 9h11a5 5 0 010 10h-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          className={btnCls(false)}
          title="Zoom -"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 11h6M20 20l-4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className={btnCls(false)}
          title="Zoom +"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path
              d="M8 11h6M11 8v6M20 20l-4-4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDownload}
          className={`${btnCls(false)} hidden md:grid`}
          title="Descargar pizarra (PNG)"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 4v12m0 0l-4-4m4 4l4-4M5 20h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <div className="flex-1" />

        {/* Colors */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-[55vw] md:max-w-none">
          {COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onColor(c)}
              aria-label={`color ${c}`}
              aria-pressed={color === c && tool === "brush"}
              className={`
                h-7 w-7 rounded-full border-2 shrink-0
                ${
                  color === c && tool === "brush"
                    ? "border-white scale-110"
                    : "border-white/10"
                }
              `}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      {/* Width row */}
      <div className="flex items-center gap-3 px-1">
        <span className="text-[11px] uppercase tracking-wider text-white/50 w-12">
          grosor
        </span>
        <input
          type="range"
          min={1}
          max={9}
          step={1}
          value={width}
          onChange={(e) => onWidth(Number(e.target.value))}
          className="flex-1 accent-accent"
          aria-label="grosor del pincel"
        />
        <span className="text-[11px] tabular-nums text-white/50 w-6 text-right">
          {width}
        </span>
      </div>
    </div>
  );
}

function btnCls(active: boolean) {
  return [
    "h-11 w-11 grid place-items-center rounded-xl shrink-0",
    "transition-colors",
    active
      ? "bg-accent text-white"
      : "bg-white/5 text-white/80 hover:bg-white/10",
  ].join(" ");
}
