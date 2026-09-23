"use client";

export function SetupBanner({ url, key }: { url?: string; key?: string }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-6 text-center">
      <div className="max-w-md space-y-3 rounded-2xl border border-border bg-panel p-6">
        <h1 className="text-xl font-semibold">Falta configurar Supabase</h1>
        <p className="text-sm text-white/70 leading-relaxed">
          La pizarra funciona en tiempo real pero necesita que completes las
          variables de entorno. Editá{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
            .env.local
          </code>{" "}
          y reiniciá el dev server.
        </p>
        <ol className="text-left text-sm text-white/80 space-y-1 list-decimal pl-5">
          <li>
            Creá un proyecto en{" "}
            <span className="text-accent">supabase.com</span>.
          </li>
          <li>
            Corré el script{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
              supabase/schema.sql
            </code>{" "}
            en el SQL Editor.
          </li>
          <li>
            Pegá la <strong>URL</strong> y la <strong>anon key</strong> en{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
              .env.local
            </code>
            .
          </li>
        </ol>
        <div className="text-xs text-white/40 break-all">
          {url ? `URL: ${url}` : "URL: —"} · {key ? "KEY: ok" : "KEY: —"}
        </div>
      </div>
    </div>
  );
}