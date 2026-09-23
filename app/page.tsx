"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SetupBanner } from "@/components/SetupBanner";

type Word = {
  id: string;
  words: string;
  createdAt: number;
};

export default function Home() {
  const [words, setWords] = useState<Word[]>([]);
  const [input, setInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  // Initial fetch + realtime subscription + polling fallback
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;

    const loadAll = async () => {
      if (cancelled || !supabase) return;
      const { data, error } = await supabase
        .from("persona_words")
        .select("id, words, created_at")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        setWords(
          data.map((r) => ({
            id: r.id as string,
            words: r.words as string,
            createdAt: new Date(r.created_at as string).getTime(),
          }))
        );
      }
    };

    void loadAll();

    const channel = supabase
      .channel("persona:global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "persona_words" },
        (payload) => {
          const r = payload.new as {
            id: string;
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
                    words: r.words,
                    createdAt: new Date(r.created_at).getTime(),
                  },
                ]
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

    // Polling fallback every 2s — guarantees the collage always reflects
    // every word regardless of realtime delivery.
    const pollId = setInterval(() => {
      void loadAll();
    }, 2000);

    return () => {
      cancelled = true;
      clearInterval(pollId);
      void channel.unsubscribe();
    };
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!supabase) return;
      const trimmed = input.trim();
      if (!trimmed) {
        setError("Escribí algo");
        return;
      }
      if (trimmed.length > 200) {
        setError("Máximo 200 caracteres");
        return;
      }
      setError(null);
      setSubmitting(true);
      const { error } = await supabase.from("persona_words").insert({
        words: trimmed,
        created_at: new Date().toISOString(),
      });
      setSubmitting(false);
      if (error) {
        setError(error.message);
      } else {
        setInput("");
      }
    },
    [input]
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
            {words.length} {words.length === 1 ? "palabra" : "palabras"}
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
              placeholder="ej: muy simpática"
              maxLength={200}
              autoComplete="off"
              className="flex-1 rounded-xl border border-border bg-panel px-4 py-3 text-base outline-none placeholder:text-white/30 focus:border-accent"
            />
            <button
              type="submit"
              disabled={submitting || !input.trim()}
              className="rounded-xl bg-accent px-5 py-3 font-medium text-white transition-colors hover:bg-accent/90 disabled:opacity-40"
            >
              Enviar
            </button>
          </div>
          {error && (
            <p className="text-xs text-rose-400 text-center">{error}</p>
          )}
          <p className="text-xs text-white/40 text-center">Anónimo. Cada envío agrega una palabra al collage.</p>
        </form>
      </section>

      {/* Collage */}
      <section className="relative flex-1 min-h-[60vh]">
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
    <div className="relative min-h-[60vh] w-full flex flex-wrap items-center justify-center content-center gap-x-6 gap-y-5 px-6 py-10">
      {words.map((w) => {
        const layout = layoutFor(w.id);
        return (
          <span
            key={w.id}
            className="inline-block select-none text-center"
            style={{
              fontSize: `${layout.size}px`,
              color: layout.color,
              fontWeight: layout.weight,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              fontFamily:
                'Georgia, "Times New Roman", ui-serif, serif',
              textShadow: "0 2px 18px rgba(0,0,0,0.55)",
              padding: "0.1em 0.25em",
            }}
          >
            {w.words}
          </span>
        );
      })}
    </div>
  );
}

function layoutFor(id: string): {
  size: number;
  color: string;
  weight: number;
} {
  const seed = hash(id);
  const r = mulberry32(seed);
  const size = 30 + r() * 18;
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
  const weight = r() > 0.5 ? 700 : 500;
  return { size, color, weight };
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
