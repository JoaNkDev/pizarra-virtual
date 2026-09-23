"use client";

import { useEffect, useState } from "react";

/**
 * Briefly flashes a white overlay when the whiteboard clears.
 */
export function ClearOverlay({ trigger }: { trigger: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (trigger === 0) return;
    setShow(true);
    const t = setTimeout(() => setShow(false), 350);
    return () => clearTimeout(t);
  }, [trigger]);

  if (!show) return null;
  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 bg-white animate-fade-in"
      aria-hidden
    />
  );
}