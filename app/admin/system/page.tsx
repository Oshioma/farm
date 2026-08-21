"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Status = "ok" | "warn" | "fail" | "unknown";

type Check = {
  key: string;
  label: string;
  status: Status;
  detail: string;
  impact?: string;
  ms?: number;
};

type EnvCheck = Check & { required: boolean; group: string };
type MigrationCheck = Check & { version: string };

type Report = {
  checkedAt: string;
  runtime: {
    nodeEnv: string;
    vercelEnv: string | null;
    region: string | null;
    commit: string | null;
    project: string | null;
  };
  adminError: string | null;
  env: EnvCheck[];
  crossChecks: Check[];
  connections: Check[];
  tables: Check[];
  migrations: MigrationCheck[];
  summary: { ok: number; warn: number; fail: number; unknown: number };
};

const DOT: Record<Status, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  fail: "bg-rose-500",
  unknown: "bg-zinc-300",
};

const PILL: Record<Status, string> = {
  ok: "bg-emerald-50 text-emerald-700",
  warn: "bg-amber-50 text-amber-700",
  fail: "bg-rose-50 text-rose-700",
  unknown: "bg-zinc-100 text-zinc-500",
};

const WORD: Record<Status, string> = {
  ok: "OK",
  warn: "Check",
  fail: "Broken",
  unknown: "Unverified",
};

function StatusRow({ check, mono }: { check: Check; mono?: boolean }) {
  return (
    <div className="flex items-start gap-3 border-b border-zinc-100 px-4 py-3 last:border-b-0">
      <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[check.status]}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-medium text-zinc-900 ${mono ? "font-mono text-[13px]" : ""}`}>{check.label}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PILL[check.status]}`}>
            {WORD[check.status]}
          </span>
          {typeof check.ms === "number" && <span className="text-[11px] text-zinc-400">{check.ms} ms</span>}
        </div>
        <p className="mt-0.5 break-words text-xs text-zinc-600">{check.detail}</p>
        {check.impact && check.status !== "ok" && (
          <p className="mt-1 text-xs text-zinc-400">{check.impact}</p>
        )}
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  checks,
  children,
}: {
  title: string;
  description: string;
  checks: Check[];
  children?: React.ReactNode;
}) {
  const fail = checks.filter((c) => c.status === "fail").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const unknown = checks.filter((c) => c.status === "unknown").length;
  // A section where nothing could be verified must not read "All good".
  const sectionStatus: Status = fail > 0 ? "fail" : warn > 0 ? "warn" : unknown > 0 ? "unknown" : "ok";
  const sectionLabel =
    fail > 0
      ? `${fail} broken`
      : warn > 0
        ? `${warn} to check`
        : unknown > 0
          ? `${unknown} unverified`
          : "All good";
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-4">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${PILL[sectionStatus]}`}>{sectionLabel}</span>
      </div>
      {children}
    </section>
  );
}

export default function SystemPage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/system", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error === "Forbidden" ? "Only the super admin can view this page." : data.error || "Failed to load");
      setReport(data as Report);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = report?.summary;
  const overall: Status = !summary
    ? "unknown"
    : summary.fail > 0
      ? "fail"
      : summary.warn > 0
        ? "warn"
        : summary.ok === 0
          ? "unknown"
          : "ok";
  const pendingMigrations = report?.migrations.filter((m) => m.status === "fail") ?? [];

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Shamba Farm Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">System</h1>
              <p className="mt-1 text-sm text-zinc-500">
                Environment variables, live connections and database schema.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={load}
                disabled={loading}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {loading ? "Checking…" : "Re-run checks"}
              </button>
              <Link href="/admin" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                &larr; Admin
              </Link>
            </div>
          </div>

          {report && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${PILL[overall]}`}>
                <span className={`h-2.5 w-2.5 rounded-full ${DOT[overall]}`} />
                {overall === "ok"
                  ? "Everything checks out"
                  : overall === "warn"
                    ? "Needs attention"
                    : overall === "fail"
                      ? "Something is broken"
                      : "Checks could not run"}
              </span>
              <span className="text-xs text-zinc-500">
                {summary?.ok} ok · {summary?.warn} to check · {summary?.fail} broken · {summary?.unknown} unverified
              </span>
              <span className="text-xs text-zinc-400">
                {new Date(report.checkedAt).toLocaleString()}
              </span>
            </div>
          )}

          {report && (
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-zinc-500">
              {report.runtime.project && <span className="rounded-full bg-zinc-100 px-2.5 py-1">project {report.runtime.project}</span>}
              <span className="rounded-full bg-zinc-100 px-2.5 py-1">{report.runtime.vercelEnv ?? report.runtime.nodeEnv}</span>
              {report.runtime.region && <span className="rounded-full bg-zinc-100 px-2.5 py-1">{report.runtime.region}</span>}
              {report.runtime.commit && <span className="rounded-full bg-zinc-100 px-2.5 py-1">commit {report.runtime.commit}</span>}
            </div>
          )}
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {loading && !report ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">
            Running checks&hellip;
          </div>
        ) : report ? (
          <div className="space-y-6">
            {pendingMigrations.length > 0 && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5">
                <h2 className="text-sm font-semibold text-rose-800">
                  {pendingMigrations.length} migration{pendingMigrations.length === 1 ? "" : "s"} not applied to this database
                </h2>
                <ul className="mt-2 space-y-1 text-xs text-rose-700">
                  {pendingMigrations.map((m) => (
                    <li key={m.key}>
                      <span className="font-mono">{m.version}_{m.label}.sql</span> — {m.detail}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-rose-700">
                  Run <span className="font-mono">npx supabase db push</span>, or paste the file from{" "}
                  <span className="font-mono">supabase/migrations/</span> into the Supabase SQL editor. See MIGRATIONS.md.
                </p>
              </div>
            )}

            {report.adminError && (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                Service role client unavailable: {report.adminError}
              </div>
            )}

            <Section
              title="Environment variables"
              description="Presence and shape only — no secret value is ever returned to the browser."
              checks={report.env}
            >
              <div>
                {report.env.map((c) => (
                  <StatusRow
                    key={c.key}
                    mono
                    check={{
                      ...c,
                      label: `${c.key}${c.required ? "" : " (optional)"}`,
                      detail: `${c.detail} — ${c.label}`,
                    }}
                  />
                ))}
              </div>
            </Section>

            {report.crossChecks.length > 0 && (
              <Section
                title="Configuration consistency"
                description="Mistakes that only show up when two settings are compared."
                checks={report.crossChecks}
              >
                <div>
                  {report.crossChecks.map((c) => (
                    <StatusRow key={c.key} check={c} />
                  ))}
                </div>
              </Section>
            )}

            <Section
              title="Connections"
              description="Live calls made just now, with round-trip times."
              checks={report.connections}
            >
              <div>
                {report.connections.map((c) => (
                  <StatusRow key={c.key} check={c} />
                ))}
              </div>
            </Section>

            <Section
              title="Migrations"
              description="Each file in supabase/migrations, checked by looking for the schema it creates."
              checks={report.migrations}
            >
              <div>
                {report.migrations.map((m) => (
                  <StatusRow key={m.key} mono check={{ ...m, label: `${m.version}_${m.label}` }} />
                ))}
              </div>
            </Section>

            <Section
              title="Tables"
              description="Every table the app queries, probed with the service role key."
              checks={report.tables}
            >
              <div className="grid gap-1.5 p-4 sm:grid-cols-2">
                {report.tables.map((t) => (
                  <div key={t.key} className="flex items-center gap-2 rounded-xl bg-zinc-50 px-3 py-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${DOT[t.status]}`} />
                    <span className="font-mono text-xs text-zinc-700">{t.key}</span>
                    {t.status !== "ok" && <span className="truncate text-[11px] text-zinc-500">{t.detail}</span>}
                  </div>
                ))}
              </div>
            </Section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
