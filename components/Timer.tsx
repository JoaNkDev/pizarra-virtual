"use client";

import { useEffect, useState } from "react";
import { CLEAR_INTERVAL_MS } from "@/lib/config";

type Props = {
  endsAt: number; // ms epoch
  onExpire: () => void;
};

function format(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timer({ endsAt, onExpire }: Props) {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState<number>(() => endsAt);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, [endsAt]);

  const remaining = endsAt - now;
  const total = CLEAR_INTERVAL_MS;
  const pct = Math.max(0, Math.min(1, remaining / total));
  const warn = remaining <= 10_000;

  useEffect(() => {
    if (mounted && remaining <= 0) {
      onExpire();
    }
  }, [mounted, remaining, onExpire]);

  // Avoid SSR/hydration mismatch: render nothing until mounted on client.
  if (!mounted) return null;

  return (
    <div
      className={`
        pointer-events-none fixed left-1/2 -translate-x-1/2 top-3 z-40
        md:top-auto md:bottom-20
        flex items-center gap-2
        rounded-full bg-panel/90 border border-border
        px-3 py-1.5 backdrop-blur
        ${warn ? "animate-pulse-warn border-rose-500/60" : ""}
      `}
      aria-live="polite"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle
          cx="12"
          cy="13"
          r="8"
          stroke="currentColor"
          strokeWidth="2"
          className={warn ? "text-rose-400" : "text-white/80"}
        />
        <path
          d="M12 9v4l2 2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={warn ? "text-rose-400" : "text-white/80"}
        />
        <path
          d="M9 3h6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className={warn ? "text-rose-400" : "text-white/80"}
        />
      </svg>
      <span
        className={`tabular-nums text-sm font-medium ${
          warn ? "text-rose-300" : "text-white/90"
        }`}
      >
        {format(remaining)}
      </span>
      <div className="h-1 w-16 rounded-full bg-white/10 overflow-hidden">
        <div
          className={`h-full ${warn ? "bg-rose-400" : "bg-accent"} transition-[width] duration-300 ease-linear`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}