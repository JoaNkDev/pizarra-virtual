import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Only warn in dev / browser; production builds stay silent and the UI
  // surfaces a SetupBanner instead of polluting server logs.
  if (
    typeof window !== "undefined" &&
    process.env.NODE_ENV !== "production"
  ) {
    // eslint-disable-next-line no-console
    console.warn(
      "[supabase] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
}

export const isConfigured = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = isConfigured
  ? createClient(url!, anonKey!, {
      realtime: {
        params: { eventsPerSecond: 30 },
      },
    })
  : null;

// Channel name is hardcoded: this is a single global whiteboard.
export const CHANNEL = "whiteboard:global";

// Realtime event names
export const EVT = {
  STROKE_START: "stroke-start",
  STROKE_EXTEND: "stroke-extend",
  STROKE_END: "stroke-end",
  CLEAR: "clear",
  UNDO: "undo",
  TIMER: "timer",
  PRESENCE: "presence",
  SYNC_REQUEST: "sync-request",
  SYNC_RESPONSE: "sync-response",
} as const;

export type EvtName = (typeof EVT)[keyof typeof EVT];