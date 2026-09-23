"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CHANNEL, EVT, isConfigured, supabase } from "./supabase";
import type {
  StrokeEndMsg,
  StrokeExtendMsg,
  StrokeStartMsg,
  SyncRequestMsg,
  SyncResponseMsg,
  UndoMsg,
} from "./types";

type IncomingHandler = (msg: unknown) => void;

/**
 * Manages the realtime channel and exposes high-level methods.
 * Single-instance per page (page.tsx is the only consumer).
 */
export function useWhiteboard(userId: string, onIncoming: IncomingHandler) {
  const [connected, setConnected] = useState(false);
  const [peersCount, setPeersCount] = useState(1);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!supabase || !userId) return;

    const channel = supabase.channel(CHANNEL, {
      config: {
        broadcast: { self: false, ack: false },
        presence: { key: userId },
      },
    });

    channelRef.current = channel;

    channel.on("broadcast", { event: "*" }, ({ event, payload }) => {
      onIncoming({ event, payload });
    });

    channel.on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setPeersCount(Object.keys(state).length || 1);
    });

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        setConnected(true);
        await channel.track({ userId, ts: Date.now() });
        channel.send({
          type: "broadcast",
          event: EVT.SYNC_REQUEST,
          payload: { userId } satisfies SyncRequestMsg,
        });
      }
    });

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const send = useCallback(<T,>(event: string, payload: T) => {
    const ch = channelRef.current;
    if (!ch) return;
    ch.send({ type: "broadcast", event, payload });
  }, []);

  const strokeStart = useCallback(
    (m: StrokeStartMsg) => send(EVT.STROKE_START, m),
    [send]
  );
  const strokeExtend = useCallback(
    (m: StrokeExtendMsg) => send(EVT.STROKE_EXTEND, m),
    [send]
  );
  const strokeEnd = useCallback(
    (m: StrokeEndMsg) => send(EVT.STROKE_END, m),
    [send]
  );
  const strokeDelete = useCallback(
    (m: { userId: string; strokeIds: string[] }) =>
      send(EVT.STROKE_DELETE, m),
    [send]
  );
  const undo = useCallback((m: UndoMsg) => send(EVT.UNDO, m), [send]);
  const syncResponse = useCallback(
    (m: SyncResponseMsg) => send(EVT.SYNC_RESPONSE, m),
    [send]
  );

  return {
    connected,
    peersCount,
    isConfigured,
    strokeStart,
    strokeExtend,
    strokeEnd,
    strokeDelete,
    undo,
    syncResponse,
    rawChannel: channelRef.current,
  };
}
