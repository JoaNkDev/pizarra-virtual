"use client";

export function SchemaBanner() {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-bg/95 p-6 text-center">
      <div className="max-w-md space-y-3 rounded-2xl border border-amber-500/30 bg-panel p-6">
        <h1 className="text-xl font-semibold text-amber-300">
          Falta crear las tablas en Supabase
        </h1>
        <p className="text-sm text-white/70 leading-relaxed">
          Las credenciales están bien pero la base está vacía. Tu proyecto
          Supabase todavía no tiene las tablas <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">whiteboard_strokes</code>{" "}
          ni <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">whiteboard_state</code>.
        </p>
        <ol className="text-left text-sm text-white/80 space-y-2 list-decimal pl-5">
          <li>
            Abrí{" "}
            <a
              className="text-accent underline"
              href="https://supabase.com/dashboard/project/ltgejignmnljxjlhimyo/sql/new"
              target="_blank"
              rel="noreferrer"
            >
              SQL Editor de tu proyecto
            </a>
          </li>
          <li>
            New query → pegá todo el contenido de{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs">
              supabase/schema.sql
            </code>
          </li>
          <li>Run (Ctrl+Enter)</li>
          <li>Recargá esta página</li>
        </ol>
        <p className="text-xs text-white/40">
          Mientras tanto el dibujo funciona igual (sin persistencia).
        </p>
      </div>
    </div>
  );
}
