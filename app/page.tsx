"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useUserId } from "@/lib/useUserId";
import { SetupBanner } from "@/components/SetupBanner";

type Word = {
  id: string;
  userId: string;
  words: string;
  createdAt: number;
};

const MAX_WORDS = 2;

export default function Home() {
  const userId = useUserId();
  const [words, setWords] = useState<Word[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Fetch + subscribe to all words
  useEffect(() => {
    if (!supabase || !userId) return;
    let cancelled = false;

    void (async () => {
      const { data, error } = await supabase
        .from("persona_words")
        .select("*")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        setWords(
          data.map((r) => ({
            id: r.id as string,
            userId: r.user_id as string,
            words: r.words as string,
            createdAt: new Date(r.created_at as string).getTime(),
          }))
        );
      }
    })();

    const channel = supabase
      .channel("persona:global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "persona_words" },
        (payload) => {
          const r = payload.new as {
            id: string;
            user_id: string;
            words: string;
            created_at: string;
          };
          setWords((prev) =>
            prev.some((w) => w.id === r.id)
              ? prev
              : [
                  ...prev,
                  {
                    id: r.id,
                    userId: r.user_id,
                    words: r.words,
                    createdAt: new Date(r.created_at).getTime(),
                  },
                ]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "persona_words" },
        (payload) => {
          const r = payload.new as {
            id: string;
            user_id: string;
            words: string;
            created_at: string;
          };
          setWords((prev) =>
            prev.map((w) =>
              w.id === r.id
                ? {
                    ...w,
                    words: r.words,
                    createdAt: new Date(r.created_at).getTime(),
                  }
                : w
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "persona_words" },
        (payload) => {
          const old = payload.old as { id: string };
          setWords((prev) => prev.filter((w) => w.id !== old.id));
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    return () => {
      cancelled = true;
      void channel.unsubscribe();
    };
  }, [userId]);

  const myWord = useMemo(
    () => words.find((w) => w.userId === userId) ?? null,
    [words, userId]
  );

  const validate = useCallback((text: string): string | null => {
    const trimmed = text.trim();
    if (!trimmed) return "Escribí al menos una palabra";
    const parts = trimmed.split(/\s+/);
    if (parts.length > MAX_WORDS) return `Máximo ${MAX_WORDS} palabras`;
    return null;
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase || !userId) return;
      const trimmed = input.trim();
      const err = validate(trimmed);
      if (err) {
        setError(err);
        return;
      }
      setError(null);
      setSubmitting(true);
      const { error } = await supabase.from("persona_words").upsert(
        {
          user_id: userId,
          words: trimmed,
          created_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      setSubmitting(false);
      if (error) {
        setError(error.message);
      } else {
        setInput("");
      }
    },
    [input, userId, validate]
  );

  if (!isConfigured) {
    return <SetupBanner url={process.env.NEXT_PUBLIC_SUPABASE_URL} key={process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? "ok" : ""} />;
  }

  return (
    <main className="relative min-h-screen flex flex-col collage-bg">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 md:px-10 md:pt-10 text-center">
        <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">
          Describan a la persona que tienen adelante
        </h1>
        <div className="mt-3 flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-white/50">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              connected ? "bg-emerald-400" : "bg-rose-400"
            }`}
          />
          <span>{connected ? "en vivo" : "conectando…"}</span>
          <span>·</span>
          <span>
            {words.length} {words.length === 1 ? "descripción" : "descripciones"}
          </span>
        </div>
      </header>

      {/* Submit form */}
      <section className="px-5 md:px-10 pb-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-md flex-col gap-2"
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                if (error) setError(null);
              }}
              placeholder={
                myWord
                  ? `Cambiar tu palabra (${myWord.words})`
                  : "ej: muy simpática"
              }
              maxLength={40}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-panel px-4 py-3 text-base outline-none placeholder:text-white/30 focus:border-accent"
            />
            <button
              type="submit"
              disabled={submitting || !input.trim()}
              className="rounded-xl bg-accent px-5 py-3 font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
            >
              {myWord ? "Actualizar" : "Enviar"}
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-400 text-center">{error}</p>
          )}
          <p className="text-xs text-white/40 text-center">
            Máximo {MAX_WORDS} palabras. {myWord ? "Podés cambiar la tuya." : "Anónimo."}
          </p>
        </form>
      </section>

      {/* Collage */}
      <section className="relative flex-1 min-h-[60vh] overflow-hidden">
        {words.length === 0 ? (
          <div className="absolute inset-0 grid place-items-center text-white/30 text-sm">
            Esperando las primeras descripciones…
          </div>
        ) : (
          <Collage words={words} />
        )}
      </section>
    </main>
  );
}

function Collage({ words }: { words: Word[] }) {
  return (
    <div className="relative h-full w-full">
      {words.map((w, i) => {
        const layout = layoutFor(w.id, w.userId, i, words.length);
        return (
          <div
            key={w.id}
            className="absolute select-none"
            style={{
              left: `${layout.x}%`,
              top: `${layout.y}%`,
              transform: `translate(-50%, -50%) rotate(${layout.rot}deg)`,
              fontSize: `${layout.size}px`,
              color: layout.color,
              fontWeight: layout.weight,
              letterSpacing: "-0.01em",
              lineHeight: 1.1,
              fontFamily:
                'Georgia, "Times New Roman", ui-serif, serif',
              textShadow: "0 2px 12px rgba(0,0,0,0.45)",
              maxWidth: "60vw",
              whiteSpace: "nowrap",
            }}
          >
            {w.words}
          </div>
        );
      })}
    </div>
  );
}

// Deterministic layout based on word id (stable across reloads)
function layoutFor(
  id: string,
  userId: string,
  index: number,
  total: number
): { x: number; y: number; rot: number; size: number; color: string; weight: number } {
  const seed = hash(id);
  const r = mulberry32(seed);
  // Spread across canvas using poisson-like jitter from index
  const cols = Math.max(1, Math.ceil(Math.sqrt(total)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const baseX = ((col + 0.5) / cols) * 100;
  const baseY = ((row + 0.5) / Math.max(1, Math.ceil(total / cols))) * 100;
  const jitterX = (r() - 0.5) * 18;
  const jitterY = (r() - 0.5) * 14;
  const rot = (r() - 0.5) * 22; // -11°..+11°
  const size = 28 + r() * 28; // 28..56px
  const palette = [
    "#ffffff",
    "#ffd6a8",
    "#ffc1cc",
    "#c4faf8",
    "#fdffb6",
    "#a0c4ff",
    "#bdb2ff",
    "#ffadad",
  ];
  const color = palette[Math.floor(r() * palette.length)];
  const weight = r() > 0.5 ? 600 : 700;
  return {
    x: clamp(baseX + jitterX, 5, 95),
    y: clamp(baseY + jitterY, 8, 92),
    rot,
    size,
    color,
    weight,
  };
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
