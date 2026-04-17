import Link from "next/link";
import { Fraunces, Manrope } from "next/font/google";

const headingFont = Fraunces({
  subsets: ["latin"],
  weight: ["500", "700"],
});

const bodyFont = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function HomePage() {
  return (
    <main
      className={`${bodyFont.className} min-h-screen bg-[radial-gradient(circle_at_top_left,_#f6fde8_0%,_#eff7df_35%,_#ecf0e5_70%,_#e7ece3_100%)] px-6 py-14 text-zinc-900 sm:px-10`}
    >
      <section className="mx-auto max-w-3xl rounded-[28px] border border-zinc-200/80 bg-white/85 p-8 shadow-[0_20px_60px_-24px_rgba(35,52,20,0.35)] backdrop-blur sm:p-10">
        <p className="mb-4 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
          Farm Operations Platform
        </p>

        <h1 className={`${headingFont.className} text-4xl leading-tight text-zinc-900 sm:text-5xl`}>
          Shamba Online
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
          Shamba Online helps small farms plan, track, and improve day-to-day
          farm work in one place.
        </p>

        <div className="mt-7 rounded-2xl border border-zinc-200 bg-zinc-50/80 p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-zinc-600">
            Use it to
          </p>
          <ul className="mt-3 space-y-2.5 text-sm text-zinc-700 sm:text-base">
            <li>Organize crops, trees, zones, and farm systems</li>
            <li>Track tasks, work hours, and harvest activity</li>
            <li>Monitor soil, compost, and seedling progress over time</li>
          </ul>
        </div>

        <div className="mt-8">
          <Link
            href="/farm"
            className="inline-flex items-center justify-center rounded-2xl bg-zinc-900 px-7 py-4 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(15,23,42,0.6)] transition hover:-translate-y-0.5 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
          >
            Open Farm Manager
          </Link>
        </div>
      </section>
    </main>
  );
}
