"use client";

import { useEffect, useState } from "react";
import { supabase, isConfigured } from "@/lib/supabase";
import { SetupBanner } from "@/components/SetupBanner";

export default function AdminPage() {
  const [count, setCount] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const loadCount = async () => {
    if (!supabase) return;
    const { count, error } = await supabase
      .from("persona_words")
      .select("*", { count: "exact", head: true });
    if (error) {
      setStatus(`Error al contar: ${error.message}`);
    } else {
      setCount(count ?? 0);
      setStatus("");
    }
  };

  const clearAll = async () => {
    if (!supabase) return;
    if (!confirm("¿Borrar TODAS las palabras del collage?")) return;
    setBusy(true);
    setStatus("Borrando…");
    const { error } = await supabase
      .from("persona_words")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    setBusy(false);
    if (error) {
      setStatus(`Error: ${error.message}`);
    } else {
      setStatus("Listo ✓ Collage vacío.");
      setCount(0);
    }
  };

  useEffect(() => {
    if (isConfigured) void loadCount();
  }, []);

  if (!isConfigured) return <SetupBanner />;

  return (
    <main className="min-h-screen collage-bg flex flex-col items-center justify-center p-6 text-white">
      <h1 className="text-3xl font-bold mb-2">Admin</h1>
      <p className="text-white/50 text-sm mb-8">
        Pizarra Virtual — limpieza
      </p>

      <div className="rounded-2xl border border-border bg-panel/80 backdrop-blur px-6 py-5 w-full max-w-sm text-center space-y-4">
        <button
          type="button"
          onClick={loadCount}
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm w-full disabled:opacity-50"
        >
          Contar palabras
        </button>
        {count !== null && (
          <p className="text-2xl font-semibold tabular-nums">
            {count}
            <span className="text-white/40 text-sm ml-2">
              {count === 1 ? "palabra" : "palabras"}
            </span>
          </p>
        )}
        <button
          type="button"
          onClick={clearAll}
          disabled={busy}
          className="px-5 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-medium w-full disabled:opacity-40"
        >
          {busy ? "Borrando…" : "Borrar todo el collage"}
        </button>
        {status && <p className="text-xs text-white/60">{status}</p>}
        <p className="text-xs text-white/30 pt-2">
          Sin auth — anyone con el link puede borrar.
        </p>
      </div>
    </main>
  );
}
