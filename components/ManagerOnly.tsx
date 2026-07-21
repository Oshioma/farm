"use client";

import Link from "next/link";

/**
 * Full-page notice shown when a worker opens a manager-only page. The real
 * enforcement is in the database (RLS); this just avoids showing a worker an
 * empty or broken screen and points them back to the dashboard.
 */
export function ManagerOnly({ title = "Managers only" }: { title?: string }) {
  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-zinc-500">
            This section is only available to farm managers. If you need access,
            ask your farm&apos;s owner.
          </p>
          <Link
            href="/farm"
            className="mt-6 inline-block rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
