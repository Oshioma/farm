"use client";

import { useMemo, useState } from "react";
import type { ShopData, ShopMonth, ShopProduce } from "@/lib/shop";

/* ── shared styling ───────────────────────────────────────────
   The shopfront's own palette: the app's brand green over warm paper. */
const PAPER = "#faf7f2";
const INK = "#1c1917";
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

function money(value: number): string {
  return `KSh ${Math.round(value).toLocaleString()}`;
}

function produceName(p: ShopProduce): string {
  return p.variety ? `${p.name} · ${p.variety}` : p.name;
}

/** A line in the basket, before it is sent. Weights only — the shop sells
    kilos, not shares of a bed a stranger cannot see. */
type BasketLine = {
  id: string;
  cropId: string;
  cropName: string;
  season: number;
  monthKey: string;
  monthLabel: string;
  quantityKg: number;
  pricePerKg: number | null;
};

export function Shopfront({ shop }: { shop: ShopData }) {
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [open, setOpen] = useState<ShopProduce | null>(null);
  const [checkout, setCheckout] = useState(false);
  const [sent, setSent] = useState<{ crop: string; when: string; amount: string }[] | null>(null);
  const [form, setForm] = useState({ name: "", contactName: "", phone: "", email: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const seasonTotal = useMemo(() => shop.months.reduce((sum, m) => sum + m.expectedKg, 0), [shop.months]);
  const availableTotal = useMemo(
    () => shop.produce.reduce((sum, p) => sum + p.totalAvailableKg, 0),
    [shop.produce]
  );
  const reservedPct = seasonTotal > 0 ? Math.round(((seasonTotal - availableTotal) / seasonTotal) * 100) : 0;
  const basketKg = basket.reduce((sum, l) => sum + l.quantityKg, 0);
  const basketValue = basket.reduce((sum, l) => sum + l.quantityKg * (l.pricePerKg ?? 0), 0);

  function addLine(line: BasketLine) {
    setBasket((prev) => [...prev, line]);
    setOpen(null);
  }

  async function submit() {
    if (!form.name.trim() || (!form.phone.trim() && !form.email.trim()) || basket.length === 0) return;
    try {
      setSaving(true);
      setError("");
      const res = await fetch(`/api/shop/${encodeURIComponent(shop.farm.slug)}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: basket.map((l) => ({
            cropId: l.cropId,
            season: l.season,
            monthKey: l.monthKey,
            quantityKg: l.quantityKg,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send your pre-order.");
      setSent(data.summary ?? []);
      setBasket([]);
      setCheckout(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your pre-order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ background: PAPER, color: INK, fontFamily: sans, minHeight: "100vh" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24,
          padding: "20px clamp(20px, 5vw, 64px)", borderBottom: `1px solid ${LINE}`,
          position: "sticky", top: 0, background: PAPER, zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, minWidth: 0 }}>
          <span style={{ fontFamily: serif, fontSize: 24, letterSpacing: "-0.01em" }}>{shop.farm.name}</span>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>
            Shamba Online
          </span>
        </div>
        <button
          onClick={() => { setSent(null); setCheckout(true); }}
          disabled={basket.length === 0}
          style={{
            background: basket.length ? GREEN : "#ffffff", color: basket.length ? "#ffffff" : "#a8a29e",
            border: `1px solid ${basket.length ? GREEN : LINE}`, fontFamily: sans, fontSize: 14, fontWeight: 600,
            padding: "12px 22px", borderRadius: 999, cursor: basket.length ? "pointer" : "default", minHeight: 44,
          }}
        >
          {basket.length ? `Your pre-order · ${basket.length}` : "Nothing reserved yet"}
        </button>
      </header>

      {/* Hero */}
      <section
        style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "clamp(28px, 5vw, 64px)",
          alignItems: "center", padding: "clamp(36px, 6vw, 72px) clamp(20px, 5vw, 64px)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "flex-start" }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: OCHRE }}>
            {shop.farm.name}{shop.farm.location ? ` · ${shop.farm.location}` : ""}
          </span>
          <h1 style={{ fontFamily: serif, fontWeight: 400, fontSize: "clamp(38px, 5vw, 60px)", lineHeight: 1.05, letterSpacing: "-0.02em", margin: 0, textWrap: "pretty" }}>
            Claim your share before it is picked.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#57534e", maxWidth: "46ch", margin: 0, textWrap: "pretty" }}>
            Everything on this page is already in the ground with a harvest expected against it. Reserve the kilos
            you want, and collect them the week they come out.
          </p>
          <a
            href="#produce"
            style={{ background: GREEN, color: "#ffffff", fontSize: 15, fontWeight: 600, padding: "15px 28px", borderRadius: 999, textDecoration: "none", minHeight: 44, display: "inline-flex", alignItems: "center" }}
          >
            See what&rsquo;s coming
          </a>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, paddingTop: 8 }}>
            <Stat value={String(shop.produce.length)} label="crops with a harvest date" />
            <Stat value={fmtKg(seasonTotal)} label="expected this season" />
            <Stat value={`${reservedPct}%`} label="already reserved" color={OCHRE} />
          </div>
        </div>

        {shop.farm.heroUrl ? (
          <div style={{ borderRadius: 24, overflow: "hidden", background: DEEP, position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={shop.farm.heroUrl}
              alt={`Produce from ${shop.farm.name}`}
              style={{ display: "block", width: "100%", height: "clamp(280px, 34vw, 460px)", objectFit: "cover" }}
            />
            <p style={{ position: "absolute", left: 0, right: 0, bottom: 0, margin: 0, padding: "48px 24px 20px", fontSize: 13, color: "#ffffff", background: "linear-gradient(to top, rgba(5,46,22,0.85), rgba(5,46,22,0))" }}>
              Picked to order, never held in cold store.
            </p>
          </div>
        ) : (
          <div style={{ borderRadius: 24, background: DEEP, padding: "clamp(24px, 3vw, 36px)" }}>
            <BedsIllustration />
            <p style={{ fontSize: 13, color: "#a7d3b4", paddingTop: 20, margin: 0 }}>
              Picked to order, never held in cold store.
            </p>
          </div>
        )}
      </section>

      {/* Season strip */}
      {shop.months.some((m) => m.crops > 0) && (
        <section style={{ padding: "8px clamp(20px, 5vw, 64px) 24px" }}>
          <SectionHead
            eyebrow="The season ahead"
            title="What is coming, and when"
            note="Weights are the farm's own estimates, updated as the crop grows."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
            {shop.months.filter((m) => m.crops > 0).map((m) => {
              const now = shop.currentMonth?.season === m.season && shop.currentMonth?.key === m.key;
              return (
                <div key={`${m.season}:${m.key}`} style={{ border: `1px solid ${now ? GREEN : LINE}`, background: "#ffffff", borderRadius: 20, padding: 20 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: now ? GREEN : "#a8a29e", margin: 0 }}>
                    {m.label} &rsquo;{String(m.calendarYear).slice(-2)}
                  </p>
                  <p style={{ fontFamily: serif, fontSize: 30, paddingTop: 8, margin: 0 }}>{fmtKg(m.expectedKg)}</p>
                  <p style={{ fontSize: 12, color: "#78716c", paddingTop: 4, margin: 0 }}>
                    {m.crops} crop{m.crops === 1 ? "" : "s"}{now ? " · picking now" : ""}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Produce */}
      <section id="produce" style={{ padding: "40px clamp(20px, 5vw, 64px) 24px", scrollMarginTop: 90 }}>
        <SectionHead
          eyebrow="Open for pre-order"
          title="Produce with a harvest date"
          note="If a crop has no expected harvest against it, it is not listed here. Nothing is sold on a maybe."
        />
        {shop.produce.length === 0 ? (
          <div style={{ background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 24, padding: 40, textAlign: "center", color: "#78716c" }}>
            Nothing is expected out of the ground just now. Check back next season.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 20 }}>
            {shop.produce.map((p) => (
              <ProduceCard key={p.cropId} produce={p} onOpen={() => setOpen(p)} />
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section style={{ padding: "40px clamp(20px, 5vw, 64px) 8px" }}>
        <div style={{ background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 28, padding: "clamp(28px, 4vw, 44px)" }}>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 34, letterSpacing: "-0.01em", margin: 0, paddingBottom: 28 }}>
            Three steps, no card needed
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 32 }}>
            <Step n="Step one" title="Reserve your kilos" body="Pick a crop, pick the month it is coming out, and say how many kilos you want from it." />
            <Step n="Step two" title="We pick to your order" body="You hear from us the week it is ready with the real weight. Short of a good crop, we tell you early rather than late." />
            <Step n="Step three" title="Collect and settle" body="Collect on the agreed day and pay then. Nothing is charged when you reserve." />
          </div>
        </div>
      </section>

      <footer style={{ display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", padding: "48px clamp(20px, 5vw, 64px) 64px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ fontFamily: serif, fontSize: 22 }}>{shop.farm.name}</span>
          {shop.farm.location && <p style={{ fontSize: 14, color: "#78716c", margin: 0 }}>{shop.farm.location}</p>}
        </div>
        <p style={{ fontSize: 13, color: "#a8a29e", maxWidth: "44ch", margin: 0, textWrap: "pretty" }}>
          Prices are per kilo and settled on the day at the weighed amount. Estimates move with the weather — we would
          rather say so than promise a number we cannot pick.
        </p>
      </footer>

      {open && <ProduceSheet produce={open} onClose={() => setOpen(null)} onAdd={addLine} />}

      {checkout && (
        <Checkout
          basket={basket}
          basketKg={basketKg}
          basketValue={basketValue}
          form={form}
          setForm={setForm}
          saving={saving}
          error={error}
          onRemove={(id) => setBasket((prev) => prev.filter((l) => l.id !== id))}
          onClose={() => setCheckout(false)}
          onSubmit={submit}
        />
      )}

      {sent && <Confirmation lines={sent} farm={shop.farm.name} onClose={() => setSent(null)} />}
    </main>
  );
}

/* ── pieces ───────────────────────────────────────────────── */

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontFamily: serif, fontSize: 30, color: color ?? GREEN }}>{value}</span>
      <span style={{ fontSize: 12, color: "#78716c" }}>{label}</span>
    </div>
  );
}

function SectionHead({ eyebrow, title, note }: { eyebrow: string; title: string; note: string }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between", paddingBottom: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.18em", textTransform: "uppercase", color: "#a8a29e" }}>{eyebrow}</span>
        <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 34, letterSpacing: "-0.01em", margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 14, color: "#78716c", maxWidth: "42ch", margin: 0, textWrap: "pretty" }}>{note}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#a8a29e" }}>{n}</span>
      <h3 style={{ fontFamily: serif, fontWeight: 400, fontSize: 22, margin: 0 }}>{title}</h3>
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#57534e", margin: 0 }}>{body}</p>
    </div>
  );
}

function monthRange(p: ShopProduce): string {
  if (p.months.length === 1) return p.months[0].label;
  return `${p.months[0].label}–${p.months[p.months.length - 1].label}`;
}

function ProduceCard({ produce, onOpen }: { produce: ShopProduce; onOpen: () => void }) {
  const claimed = produce.totalExpectedKg > 0
    ? Math.min(100, Math.round(((produce.totalExpectedKg - produce.totalAvailableKg) / produce.totalExpectedKg) * 100))
    : 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, background: "#ffffff", border: `1px solid ${LINE}`, borderRadius: 24, padding: 22 }}>
      {produce.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={produce.imageUrl}
          alt={produce.name}
          loading="lazy"
          style={{ display: "block", width: "100%", height: 160, objectFit: "cover", borderRadius: 16, marginBottom: 2 }}
        />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: serif, fontSize: 24 }}>{produce.name}</span>
          <span style={{ fontSize: 13, color: "#78716c" }}>
            {[produce.variety, produce.beds && `bed ${produce.beds}`].filter(Boolean).join(" · ") || " "}
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: GREEN, background: "#ecfdf3", padding: "6px 10px", borderRadius: 999, whiteSpace: "nowrap" }}>
          {monthRange(produce)}
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 13, color: "#57534e" }}>
            {produce.totalExpectedKg > 0 ? `${fmtKg(produce.totalExpectedKg)} expected` : produce.months[0].expectedText}
          </span>
          {produce.totalExpectedKg > 0 && (
            <span style={{ fontSize: 13, fontWeight: 600, color: OCHRE }}>{fmtKg(produce.totalAvailableKg)} free</span>
          )}
        </div>
        <div style={{ height: 6, borderRadius: 999, background: "#f0e9dd", overflow: "hidden" }}>
          <div style={{ width: `${claimed}%`, height: "100%", background: GREEN }} />
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingTop: 2 }}>
        <span style={{ fontSize: 14 }}>
          {produce.pricePerKg !== null ? (
            <><strong>{money(produce.pricePerKg)}</strong> <span style={{ color: "#a8a29e" }}>/ kg</span></>
          ) : (
            <span style={{ color: "#a8a29e" }}>Price on collection</span>
          )}
        </span>
        <button
          onClick={onOpen}
          style={{ fontFamily: sans, fontSize: 13, fontWeight: 600, color: GREEN, background: "#ffffff", border: "1px solid #cfe6d7", padding: "11px 18px", borderRadius: 999, cursor: "pointer", minHeight: 44 }}
        >
          Reserve
        </button>
      </div>
    </div>
  );
}

/* The reserve sheet: pick a month, then say how many kilos. */
function ProduceSheet({ produce, onClose, onAdd }: { produce: ShopProduce; onClose: () => void; onAdd: (l: BasketLine) => void }) {
  const [monthIdx, setMonthIdx] = useState(0);
  const [kg, setKg] = useState("");

  const month: ShopMonth = produce.months[monthIdx];
  const kgNum = Number(kg);
  const wanted = Number.isFinite(kgNum) && kgNum > 0 ? kgNum : null;
  const tooMuch = wanted !== null && month.availableKg !== null && wanted > month.availableKg;
  const valid = wanted !== null && !tooMuch;

  /* Quick amounts, kept under what is actually left that month. */
  const picks = [5, 10, 25, 50].filter((v) => month.availableKg === null || v <= month.availableKg);

  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {produce.imageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={produce.imageUrl}
            alt={produce.name}
            style={{ display: "block", width: "100%", height: 200, objectFit: "cover", borderRadius: 18 }}
          />
        )}
        <div>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, margin: 0 }}>{produceName(produce)}</h2>
          {produce.beds && <p style={{ fontSize: 13, color: "#78716c", margin: "4px 0 0" }}>Bed {produce.beds}</p>}
        </div>

        {produce.notes && (
          <p style={{ fontSize: 15, lineHeight: 1.6, color: "#57534e", margin: 0, textWrap: "pretty" }}>{produce.notes}</p>
        )}

        <Labelled label="Harvest month">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {produce.months.map((m, i) => (
              <button
                key={`${m.season}:${m.key}`}
                onClick={() => { setMonthIdx(i); setKg(""); }}
                style={{
                  flexGrow: 1, fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44,
                  color: i === monthIdx ? "#ffffff" : INK, background: i === monthIdx ? GREEN : "#ffffff",
                  border: `1px solid ${i === monthIdx ? GREEN : "#ded6c9"}`, borderRadius: 14, padding: "12px 10px",
                }}
              >
                {m.label} &rsquo;{String(m.calendarYear).slice(-2)}
              </button>
            ))}
          </div>
        </Labelled>

        <div style={{ background: "#f7f3ec", borderRadius: 18, padding: 16, display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontSize: 14, color: "#57534e" }}>Expected in {month.label}</span>
          <span style={{ fontSize: 14, fontWeight: 700 }}>
            {month.expectedKg !== null ? fmtKg(month.expectedKg) : month.expectedText}
            {month.availableKg !== null && <span style={{ color: OCHRE, fontWeight: 600 }}> · {fmtKg(month.availableKg)} free</span>}
          </span>
        </div>

        <Labelled label="How many kilos">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            {picks.map((v) => (
              <button
                key={v}
                onClick={() => setKg(String(v))}
                style={{
                  fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44, padding: "10px 18px",
                  color: kg === String(v) ? "#ffffff" : INK, background: kg === String(v) ? GREEN : "#ffffff",
                  border: `1px solid ${kg === String(v) ? GREEN : "#ded6c9"}`, borderRadius: 12,
                }}
              >
                {v} kg
              </button>
            ))}
            {month.availableKg !== null && month.availableKg > 0 && (
              <button
                onClick={() => setKg(String(Math.floor(month.availableKg as number)))}
                style={{
                  fontFamily: sans, fontSize: 14, fontWeight: 600, cursor: "pointer", minHeight: 44, padding: "10px 18px",
                  color: INK, background: "#ffffff", border: "1px solid #ded6c9", borderRadius: 12,
                }}
              >
                All {fmtKg(month.availableKg)}
              </button>
            )}
            <input
              type="number" min="1" value={kg} onChange={(e) => setKg(e.target.value)} placeholder="kg"
              style={{ width: 100, fontFamily: sans, fontSize: 15, padding: "12px 14px", borderRadius: 12, border: "1px solid #ded6c9", minHeight: 44 }}
            />
          </div>
        </Labelled>

        <div style={{ background: "#f7f3ec", borderRadius: 18, padding: 18, display: "flex", flexDirection: "column", gap: 6 }}>
          {tooMuch ? (
            <span style={{ fontSize: 14, color: "#9f1239" }}>
              Only {fmtKg(month.availableKg ?? 0)} is still unclaimed that month.
            </span>
          ) : wanted !== null ? (
            <>
              <span style={{ fontSize: 15 }}>
                <strong>{fmtKg(wanted)}</strong> of {produce.name} in {month.label}
                {produce.pricePerKg !== null && <> · about {money(wanted * produce.pricePerKg)}</>}
              </span>
              <span style={{ fontSize: 13, color: "#78716c", textWrap: "pretty" }}>
                We pick to the weight you reserve and weigh it on the day. If the crop falls short, we tell you early
                rather than late.
              </span>
            </>
          ) : (
            <span style={{ fontSize: 14, color: "#78716c" }}>
              {month.expectedKg === null
                ? `The farm expects "${month.expectedText}" that month, so say how many kilos you would like and they will confirm.`
                : "Say how many kilos you would like."}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            disabled={!valid}
            onClick={() =>
              onAdd({
                id: `${produce.cropId}:${month.season}:${month.key}:${Date.now()}`,
                cropId: produce.cropId,
                cropName: produceName(produce),
                season: month.season,
                monthKey: month.key,
                monthLabel: `${month.label} ${month.calendarYear}`,
                quantityKg: wanted as number,
                pricePerKg: produce.pricePerKg,
              })
            }
            style={{
              flexGrow: 1, fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#ffffff",
              background: valid ? GREEN : "#c7c2ba", border: "none", padding: 16, borderRadius: 999,
              cursor: valid ? "pointer" : "default", minHeight: 44,
            }}
          >
            Add to pre-order
          </button>
          <button onClick={onClose} style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, background: "#ffffff", border: `1px solid ${LINE}`, padding: "16px 24px", borderRadius: 999, cursor: "pointer", minHeight: 44 }}>
            Cancel
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Checkout({
  basket, basketKg, basketValue, form, setForm, saving, error, onRemove, onClose, onSubmit,
}: {
  basket: BasketLine[]; basketKg: number; basketValue: number;
  form: { name: string; contactName: string; phone: string; email: string; notes: string };
  setForm: (f: { name: string; contactName: string; phone: string; email: string; notes: string }) => void;
  saving: boolean; error: string;
  onRemove: (id: string) => void; onClose: () => void; onSubmit: () => void;
}) {
  const canSend = form.name.trim() !== "" && (form.phone.trim() !== "" || form.email.trim() !== "") && basket.length > 0;
  return (
    <Overlay onClose={onClose} wide>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 30, margin: 0 }}>Your pre-order</h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {basket.map((l) => (
            <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 14, border: `1px solid ${LINE}`, borderRadius: 18, padding: "14px 16px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, flexGrow: 1, minWidth: 0 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{l.cropName}</span>
                <span style={{ fontSize: 13, color: "#78716c" }}>
                  {fmtKg(l.quantityKg)} · {l.monthLabel}
                </span>
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, whiteSpace: "nowrap" }}>
                {l.pricePerKg !== null ? money(l.quantityKg * l.pricePerKg) : fmtKg(l.quantityKg)}
              </span>
              <button onClick={() => onRemove(l.id)} aria-label="Remove" style={{ background: "none", border: "none", color: "#a8a29e", fontSize: 20, cursor: "pointer", padding: 8, minHeight: 44 }}>
                ×
              </button>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, background: "#f7f3ec", borderRadius: 18, padding: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 14, color: "#57534e" }}>Reserved weight</span>
            <span style={{ fontSize: 15, fontWeight: 700 }}>{fmtKg(basketKg)}</span>
          </div>
          {basketValue > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 14, color: "#57534e" }}>Indicative value</span>
              <span style={{ fontSize: 15, fontWeight: 700 }}>{money(basketValue)}</span>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, textAlign: "right" }}>
            <span style={{ fontSize: 14, color: "#57534e" }}>To pay now</span>
            <span style={{ fontFamily: serif, fontSize: 22, color: GREEN }}>Nothing</span>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
          <Labelled label="Name or business *">
            <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Green Grocer Ltd" />
          </Labelled>
          <Labelled label="Who we ask for">
            <Input value={form.contactName} onChange={(v) => setForm({ ...form, contactName: v })} placeholder="Jane Wanjiku" />
          </Labelled>
          <Labelled label="Telephone">
            <Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+254…" type="tel" />
          </Labelled>
          <Labelled label="Email">
            <Input value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="orders@example.com" type="email" />
          </Labelled>
        </div>
        <Labelled label="Anything we should know">
          <Input value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} placeholder="Collection day, packing, delivery…" />
        </Labelled>
        <p style={{ fontSize: 13, color: "#78716c", margin: 0 }}>
          Leave a telephone number or an email address so the farm can confirm.
        </p>

        {error && (
          <div style={{ border: "1px solid #fecdd3", background: "#fff1f2", color: "#9f1239", borderRadius: 14, padding: "12px 16px", fontSize: 14 }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onSubmit}
            disabled={!canSend || saving}
            style={{
              flexGrow: 1, fontFamily: sans, fontSize: 16, fontWeight: 700, color: "#ffffff",
              background: canSend && !saving ? GREEN : "#c7c2ba", border: "none", padding: 17, borderRadius: 999,
              cursor: canSend && !saving ? "pointer" : "default", minHeight: 44,
            }}
          >
            {saving ? "Sending…" : "Send reservation"}
          </button>
          <button onClick={onClose} style={{ fontFamily: sans, fontSize: 15, fontWeight: 600, background: "#ffffff", border: `1px solid ${LINE}`, padding: "17px 24px", borderRadius: 999, cursor: "pointer", minHeight: 44 }}>
            Keep looking
          </button>
        </div>
      </div>
    </Overlay>
  );
}

function Confirmation({ lines, farm, onClose }: { lines: { crop: string; when: string; amount: string }[]; farm: string; onClose: () => void }) {
  return (
    <Overlay onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ width: 52, height: 52, borderRadius: 999, background: "#ecfdf3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <h2 style={{ fontFamily: serif, fontWeight: 400, fontSize: 28, margin: 0 }}>Reserved. We will pick it for you.</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, border: `1px solid ${LINE}`, borderRadius: 14, padding: "12px 16px", fontSize: 14 }}>
              <span style={{ fontWeight: 600 }}>{l.crop}</span>
              <span style={{ color: "#78716c" }}>{l.amount} · {l.when}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: "#57534e", margin: 0, textWrap: "pretty" }}>
          {farm} will be in touch to confirm. Nothing has been charged — you settle on collection, for the weight
          actually picked.
        </p>
        <button onClick={onClose} style={{ fontFamily: sans, fontSize: 15, fontWeight: 700, color: "#ffffff", background: GREEN, border: "none", padding: 16, borderRadius: 999, cursor: "pointer", minHeight: 44 }}>
          Done
        </button>
      </div>
    </Overlay>
  );
}

function Overlay({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(28,25,23,0.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "clamp(16px, 4vw, 48px)", overflowY: "auto", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: wide ? 640 : 520, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 28, padding: "clamp(20px, 4vw, 32px)" }}
      >
        {children}
      </div>
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#78716c" }}>{label}</span>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type ?? "text"}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: "100%", fontFamily: sans, fontSize: 15, padding: "14px 16px", borderRadius: 14, border: "1px solid #ded6c9", background: "#ffffff", minHeight: 44 }}
    />
  );
}

function BedsIllustration() {
  return (
    <svg viewBox="0 0 520 420" width="100%" height="auto" role="img" aria-label="Illustration of planted beds">
      <defs>
        <linearGradient id="shopsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#134e2a" />
          <stop offset="100%" stopColor={DEEP} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="420" fill="url(#shopsky)" />
      <circle cx="416" cy="86" r="42" fill={OCHRE} opacity="0.85" />
      <g stroke="#3f8f5a" strokeWidth="2" fill="none" opacity="0.55">
        <path d="M0 250 C 130 226, 390 226, 520 250" />
        <path d="M0 286 C 130 262, 390 262, 520 286" />
        <path d="M0 322 C 130 298, 390 298, 520 322" />
        <path d="M0 358 C 130 334, 390 334, 520 358" />
      </g>
      <g fill="#5fae76">
        <circle cx="70" cy="246" r="9" /><circle cx="150" cy="240" r="9" /><circle cx="230" cy="238" r="9" />
        <circle cx="310" cy="240" r="9" /><circle cx="390" cy="244" r="9" /><circle cx="464" cy="248" r="9" />
      </g>
      <g fill="#7cc78f">
        <circle cx="42" cy="284" r="11" /><circle cx="134" cy="276" r="11" /><circle cx="226" cy="274" r="11" />
        <circle cx="318" cy="276" r="11" /><circle cx="408" cy="282" r="11" />
      </g>
      <g fill={OCHRE}>
        <circle cx="96" cy="320" r="13" /><circle cx="212" cy="312" r="13" /><circle cx="330" cy="314" r="13" /><circle cx="444" cy="322" r="13" />
      </g>
      <g fill="#93c5a4">
        <circle cx="60" cy="358" r="12" /><circle cx="180" cy="350" r="12" /><circle cx="300" cy="350" r="12" /><circle cx="420" cy="356" r="12" />
      </g>
    </svg>
  );
}
