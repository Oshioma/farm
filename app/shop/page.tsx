import Link from "next/link";
import type { Metadata } from "next";
import { getMarketData } from "@/lib/shop";
import type { MarketFarm, ShopProduce } from "@/lib/shop";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "The market — produce to reserve",
  description: "Everything the farms have coming out of the ground, with the weight expected and what is still unclaimed.",
};

/* Market palette, shared with each farm's own shopfront. */
const PAPER = "#faf7f2";
const GREEN = "#166534";
const DEEP = "#052e16";
const OCHRE = "#b45309";
const LINE = "#e7e0d5";
const serif = "Newsreader, Georgia, serif";
const sans = "Karla, Helvetica, Arial, sans-serif";

function fmtKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t`;
  if (kg >= 10) return `${Math.round(kg).toLocaleString()} kg`;
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
}

function monthRange(p: ShopProduce): string {
  if (p.months.length === 1) return p.months[0].label;
  return `${p.months[0].label}–${p.months[p.months.length - 1].label}`;
}

export default async function MarketPage() {
  let market;
  try {
    market = await getMarketData();
  } catch {
    market = { farms: [], totalExpectedKg: 0, totalAvailableKg: 0, cropCount: 0 };
  }

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300;6..72,400;6..72,500&family=Karla:wght@400;500;600;700&display=swap"
      />

      <main style={{ background: PAPER, color: "#1c1917", fontFamily: sans, minHeight: "100vh" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, padding: "20px clamp(20px, 5vw, 64px)", borderBottom: `1px solid ${LINE}` }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
            <span style={{ fontFamily: serif, fontSize: 24 }}>The market</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>
              Shamba Online
            </span>
          </div>
        </header>

        {/* Hero */}
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(28px, 5vw, 56px)", alignItems: "center", padding: "clamp(36px, 6vw, 64px) clamp(20px, 5vw, 64px)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, alignItems: "flex-start" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: OCHRE }}>
              Reserve before it is picked
            </span>
            <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(36px, 5vw, 56px)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0, textWrap: "pretty" }}>
              Everything the farms have coming.
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "#57534e", maxWidth: "48ch", margin: 0, textWrap: "pretty" }}>
              Each crop below is already in the ground with a harvest expected against it. Reserve the kilos you want
              from the farm growing them, and collect the week they come out.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 32, paddingTop: 4 }}>
              <Stat value={String(market.farms.length)} label={`farm${market.farms.length === 1 ? "" : "s"} selling`} />
              <Stat value={String(market.cropCount)} label="crops with a harvest date" />
              <Stat value={fmtKg(market.totalAvailableKg)} label="still unclaimed" color={OCHRE} />
            </div>
          </div>

          <div style={{ borderRadius: 24, background: DEEP, padding: "clamp(24px, 3vw, 36px)", display: "flex", flexDirection: "column", gap: 18 }}>
            <p style={{ fontFamily: serif, fontSize: 24, color: "#ffffff", margin: 0 }}>How the market works</p>
            {[
              "Nothing is listed unless a harvest is expected from it.",
              "You reserve kilos, not a guess — the farm confirms the weight when it is picked.",
              "No card. You settle with the farm on collection.",
            ].map((line) => (
              <div key={line} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7cc78f" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <p style={{ fontSize: 15, lineHeight: 1.55, color: "#d3e8da", margin: 0 }}>{line}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Farms */}
        <section style={{ padding: "16px clamp(20px, 5vw, 64px) 64px", display: "flex", flexDirection: "column", gap: 40 }}>
          {market.farms.length === 0 ? (
            <div style={{ background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 24, padding: 40, textAlign: "center", color: "#78716c" }}>
              No farm has produce listed just now. Check back next season.
            </div>
          ) : (
            market.farms.map((farm) => <FarmSection key={farm.slug} farm={farm} />)
          )}
        </section>

        <footer style={{ padding: "0 clamp(20px, 5vw, 64px) 64px" }}>
          <p style={{ fontSize: 13, color: "#a8a29e", margin: 0, maxWidth: "60ch", textWrap: "pretty" }}>
            Weights are each farm&rsquo;s own estimate from the field and move with the season. You pay the farm on
            collection, for what is actually weighed out.
          </p>
        </footer>
      </main>
    </>
  );
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: serif, fontSize: 30, color: color ?? GREEN }}>{value}</span>
      <span style={{ fontSize: 12, color: "#78716c" }}>{label}</span>
    </div>
  );
}

function FarmSection({ farm }: { farm: MarketFarm }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16, borderBottom: `1px solid ${LINE}`, paddingBottom: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 32, letterSpacing: "-0.01em", margin: 0 }}>{farm.name}</h2>
          <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>
            {[farm.location, `${farm.produce.length} crop${farm.produce.length === 1 ? "" : "s"}`, `${fmtKg(farm.totalAvailableKg)} unclaimed`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <Link
          href={`/${farm.slug}`}
          style={{ background: GREEN, color: "#ffffff", fontSize: 14, fontWeight: 600, padding: "12px 22px", borderRadius: 999, textDecoration: "none", display: "inline-flex", alignItems: "center", minHeight: 44 }}
        >
          Visit {farm.name}
        </Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
        {farm.produce.map((p) => (
          <Link
            key={p.cropId}
            href={`/${farm.slug}`}
            style={{ display: "flex", flexDirection: "column", gap: 12, background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 22, padding: 20, textDecoration: "none", color: "inherit" }}
          >
            {p.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={p.imageUrl}
                alt={p.name}
                loading="lazy"
                style={{ display: "block", width: "100%", height: 150, objectFit: "cover", borderRadius: 14 }}
              />
            )}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                <span style={{ fontFamily: serif, fontSize: 22 }}>{p.name}</span>
                {p.variety && <span style={{ fontSize: 13, color: "#78716c" }}>{p.variety}</span>}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: GREEN, background: "#ecfdf3", padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
                {monthRange(p)}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
              <span style={{ fontSize: 13, color: "#57534e" }}>
                {p.totalExpectedKg > 0 ? `${fmtKg(p.totalExpectedKg)} expected` : p.months[0].expectedText}
              </span>
              {p.totalExpectedKg > 0 && (
                <span style={{ fontSize: 13, fontWeight: 600, color: OCHRE }}>{fmtKg(p.totalAvailableKg)} free</span>
              )}
            </div>
            {p.pricePerKg !== null && (
              <span style={{ fontSize: 14 }}>
                <strong>TZS {Math.round(p.pricePerKg).toLocaleString()}</strong>{" "}
                <span style={{ color: "#a8a29e" }}>/ kg</span>
              </span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
