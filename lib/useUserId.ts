"use client";

import { useEffect, useState } from "react";

const KEY = "pizarra:userId";

export function useUserId(): string {
  const [id, setId] = useState<string>("");

  useEffect(() => {
    let stored = localStorage.getItem(KEY);
    if (!stored) {
      stored =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      localStorage.setItem(KEY, stored);
    }
    setId(stored);
  }, []);

  return id;
}