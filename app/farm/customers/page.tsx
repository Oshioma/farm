"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  getFarms,
  getCustomers,
  getCustomerOrders,
  getHarvestEta,
  getZones,
  getCrops,
  seasonMonths,
  harvestSeasonYear,
  harvestMonthKeyFor,
  parseYieldKg,
  orderKg,
  bedLabel,
  ORDER_STATUSES,
} from "@/lib/farm";
import type {
  Farm,
  Customer,
  CustomerOrder,
  HarvestEtaEntry,
  Zone,
  Crop,
  SeasonMonth,
  HarvestMonthKey,
} from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";

function errMsg(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err)
    return String((err as { message: unknown }).message);
  return fallback;
}

/* Same window as the harvest ETA sheet the orders are placed against. */
const SEASON_SPAN = 2;

function fmtKg(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toLocaleString(undefined, { maximumFractionDigits: 2 })} t`;
  if (kg >= 10) return `${Math.round(kg).toLocaleString()} kg`;
  return `${kg.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg`;
}

function cropLabel(c: Crop): string {
  return c.crop_name + (c.variety ? ` · ${c.variety}` : "");
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  confirmed: "bg-emerald-50 text-emerald-700",
  fulfilled: "bg-blue-50 text-blue-700",
  cancelled: "bg-zinc-100 text-zinc-500",
};

const inp = "w-full rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-zinc-600">{label}</label>
      {children}
    </div>
  );
}

type CustomerForm = { name: string; contact_name: string; phone: string; email: string; notes: string };
const blankCustomer = (): CustomerForm => ({ name: "", contact_name: "", phone: "", email: "", notes: "" });

type OrderForm = {
  crop_id: string;
  monthId: string;
  basis: "share" | "fixed";
  share_pct: string;
  quantity_kg: string;
  price_per_kg: string;
  status: string;
  notes: string;
};

function blankOrder(defaultMonthId: string): OrderForm {
  return {
    crop_id: "",
    monthId: defaultMonthId,
    basis: "share",
    share_pct: "",
    quantity_kg: "",
    price_per_kg: "",
    status: "pending",
    notes: "",
  };
}

export default function CustomersPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [entries, setEntries] = useState<HarvestEtaEntry[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [year, setYear] = useState(() => harvestSeasonYear());
  const [tab, setTab] = useState<"customers" | "schedule">("customers");
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [customerModal, setCustomerModal] = useState<Customer | null | "new">(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(blankCustomer());
  const [orderModal, setOrderModal] = useState<{ customer: Customer; order: CustomerOrder | null } | null>(null);
  const [orderForm, setOrderForm] = useState<OrderForm>(blankOrder(""));
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);
  const activeFarmIdRef = useRef(activeFarmId);
  useEffect(() => {
    activeFarmIdRef.current = activeFarmId;
  }, [activeFarmId]);

  const months = useMemo(() => seasonMonths(year, SEASON_SPAN), [year]);
  const monthId = (m: SeasonMonth) => `${m.season}:${m.key}`;
  const defaultMonthId = `${harvestSeasonYear()}:${harvestMonthKeyFor(new Date())}`;

  useEffect(() => {
    getFarms()
      .then(setFarms)
      .catch((err) => setError(errMsg(err, "Failed to load farms")))
      .finally(() => setLoading(false));
  }, []);

  async function load(farmId: string, yr: number) {
    const seasons = Array.from({ length: SEASON_SPAN }, (_, i) => yr + i);
    const [customerRows, orderRows, etaRows, zoneRows, cropRows] = await Promise.all([
      getCustomers(farmId),
      getCustomerOrders(farmId),
      getHarvestEta(farmId, seasons),
      getZones(farmId),
      getCrops(farmId),
    ]);
    if (activeFarmIdRef.current !== farmId) return;
    setCustomers(customerRows);
    setOrders(orderRows);
    setEntries(etaRows);
    setZones(zoneRows);
    setCrops(cropRows);
  }

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    load(activeFarmId, year)
      .catch((err) => setError(errMsg(err, "Failed to load")))
      .finally(() => setLoading(false));
  }, [activeFarmId, year]);

  /* What a crop is expected to yield in one month, read off the harvest ETA
     sheet. Null when there is no estimate to take a share of. */
  function expectedKgFor(cropId: string | null, season: number | null, key: HarvestMonthKey | null): number | null {
    if (!cropId || season === null || !key) return null;
    const entry = entries.find((e) => e.crop_id === cropId && e.year === season) as
      | Record<string, unknown>
      | undefined;
    if (!entry) return null;
    return parseYieldKg((entry[`${key}_expected`] as string | null) ?? "").kg;
  }

  /** Every crop's expected total for a month, orders aside. */
  function monthExpectedKg(m: SeasonMonth): number {
    return entries
      .filter((e) => e.year === m.season)
      .reduce((sum, e) => {
        const raw = ((e as unknown as Record<string, unknown>)[`${m.key}_expected`] as string | null) ?? "";
        return sum + (parseYieldKg(raw).kg ?? 0);
      }, 0);
  }

  function resolveOrderKg(order: CustomerOrder): number | null {
    return orderKg(order, expectedKgFor(order.crop_id, order.season, order.month_key));
  }

  const liveOrders = useMemo(() => orders.filter((o) => o.status !== "cancelled"), [orders]);

  const ordersByCustomer = useMemo(() => {
    const map = new Map<string, CustomerOrder[]>();
    for (const o of orders) {
      const list = map.get(o.customer_id);
      if (list) list.push(o);
      else map.set(o.customer_id, [o]);
    }
    return map;
  }, [orders]);

  /* The schedule: for each month, what is expected and how much of it is spoken for. */
  const schedule = useMemo(() => {
    return months.map((m) => {
      const monthOrders = liveOrders.filter((o) => o.season === m.season && o.month_key === m.key);
      const expected = monthExpectedKg(m);
      const committed = monthOrders.reduce((sum, o) => sum + (resolveOrderKg(o) ?? 0), 0);
      const unresolved = monthOrders.filter((o) => resolveOrderKg(o) === null).length;
      return { month: m, orders: monthOrders, expected, committed, unresolved };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, liveOrders, entries]);

  const unscheduled = useMemo(
    () => liveOrders.filter((o) => o.season === null || !o.month_key),
    [liveOrders]
  );

  function openAddCustomer() {
    setCustomerForm(blankCustomer());
    setCustomerModal("new");
  }

  function openEditCustomer(c: Customer) {
    setCustomerForm({
      name: c.name,
      contact_name: c.contact_name ?? "",
      phone: c.phone ?? "",
      email: c.email ?? "",
      notes: c.notes ?? "",
    });
    setCustomerModal(c);
  }

  async function saveCustomer() {
    if (!activeFarmId || !customerForm.name.trim()) return;
    try {
      setSaving(true);
      setError("");
      const payload = {
        farm_id: activeFarmId,
        name: customerForm.name.trim(),
        contact_name: customerForm.contact_name.trim() || null,
        phone: customerForm.phone.trim() || null,
        email: customerForm.email.trim() || null,
        notes: customerForm.notes.trim() || null,
      };
      if (customerModal === "new") {
        const { error: e } = await supabase.from("customers").insert(payload);
        if (e) throw e;
      } else if (customerModal) {
        const { error: e } = await supabase.from("customers").update(payload).eq("id", customerModal.id);
        if (e) throw e;
      }
      await load(activeFarmId, year);
      setCustomerModal(null);
    } catch (err) {
      setError(errMsg(err, "Failed to save customer"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteCustomer(c: Customer) {
    try {
      setDeletingId(c.id);
      const { error: e } = await supabase.from("customers").update({ is_active: false }).eq("id", c.id);
      if (e) throw e;
      await load(activeFarmId, year);
    } catch (err) {
      setError(errMsg(err, "Failed to remove customer"));
    } finally {
      setDeletingId(null);
    }
  }

  function openAddOrder(customer: Customer) {
    setOrderForm(blankOrder(defaultMonthId));
    setOrderModal({ customer, order: null });
  }

  function openEditOrder(customer: Customer, order: CustomerOrder) {
    setOrderForm({
      crop_id: order.crop_id ?? "",
      monthId: order.season !== null && order.month_key ? `${order.season}:${order.month_key}` : "",
      basis: order.quantity_kg !== null ? "fixed" : "share",
      share_pct: order.share_pct !== null ? String(order.share_pct) : "",
      quantity_kg: order.quantity_kg !== null ? String(order.quantity_kg) : "",
      price_per_kg: order.price_per_kg !== null ? String(order.price_per_kg) : "",
      status: order.status,
      notes: order.notes ?? "",
    });
    setOrderModal({ customer, order });
  }

  async function saveOrder() {
    if (!activeFarmId || !orderModal) return;
    const amount = orderForm.basis === "share" ? orderForm.share_pct.trim() : orderForm.quantity_kg.trim();
    if (!amount) return;
    try {
      setSaving(true);
      setError("");
      const [seasonStr, key] = orderForm.monthId ? orderForm.monthId.split(":") : ["", ""];
      const payload = {
        farm_id: activeFarmId,
        customer_id: orderModal.customer.id,
        crop_id: orderForm.crop_id || null,
        season: seasonStr ? Number(seasonStr) : null,
        month_key: key || null,
        share_pct: orderForm.basis === "share" ? Number(orderForm.share_pct) : null,
        quantity_kg: orderForm.basis === "fixed" ? Number(orderForm.quantity_kg) : null,
        price_per_kg: orderForm.price_per_kg.trim() ? Number(orderForm.price_per_kg) : null,
        status: orderForm.status,
        notes: orderForm.notes.trim() || null,
      };
      if (orderModal.order) {
        const { error: e } = await supabase.from("customer_orders").update(payload).eq("id", orderModal.order.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("customer_orders").insert(payload);
        if (e) throw e;
      }
      await load(activeFarmId, year);
      setOrderModal(null);
    } catch (err) {
      setError(errMsg(err, "Failed to save order"));
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(id: string) {
    try {
      setDeletingId(id);
      const { error: e } = await supabase.from("customer_orders").delete().eq("id", id);
      if (e) throw e;
      setOrders((prev) => prev.filter((o) => o.id !== id));
    } catch (err) {
      setError(errMsg(err, "Failed to delete order"));
    } finally {
      setDeletingId(null);
    }
  }

  /* Live preview inside the order modal. */
  const previewExpected = (() => {
    const [seasonStr, key] = orderForm.monthId ? orderForm.monthId.split(":") : ["", ""];
    if (!orderForm.crop_id || !seasonStr || !key) return null;
    return expectedKgFor(orderForm.crop_id, Number(seasonStr), key as HarvestMonthKey);
  })();
  const previewKg = (() => {
    if (orderForm.basis === "fixed") {
      const q = Number(orderForm.quantity_kg);
      return Number.isFinite(q) && orderForm.quantity_kg.trim() ? q : null;
    }
    const pct = Number(orderForm.share_pct);
    if (!Number.isFinite(pct) || !orderForm.share_pct.trim() || previewExpected === null) return null;
    return (previewExpected * pct) / 100;
  })();

  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const lastMonth = months[months.length - 1];
  const totalCommitted = schedule.reduce((sum, s) => sum + s.committed, 0);

  function orderLine(o: CustomerOrder): string {
    const crop = crops.find((c) => c.id === o.crop_id);
    const cropName = crop ? cropLabel(crop) : "Any crop";
    const when = o.season !== null && o.month_key
      ? (() => {
          const m = months.find((mm) => mm.season === o.season && mm.key === o.month_key);
          return m ? `${m.label} ${m.calendarYear}` : `${o.month_key} ${o.season}`;
        })()
      : "unscheduled";
    return `${cropName} · ${when}`;
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                Shamba Farm Manager
              </p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Customers</h1>
              <p className="mt-1 text-sm text-zinc-500">
                {activeFarm ? `${activeFarm.name} — ` : ""}orders against upcoming harvests
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFarmId(f.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeFarmId === f.id
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              <Link href="/farm/produce-expected" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                Produce expected
              </Link>
              <Link href="/farm" className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                ← Farm
              </Link>
              <button
                onClick={async () => { await supabase.auth.signOut(); router.push("/login"); }}
                className="rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
        )}

        {/* Tabs + season window */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-full border border-zinc-200 bg-white p-1">
            {[
              { key: "customers" as const, label: `Customers (${customers.length})` },
              { key: "schedule" as const, label: "Expected & ordered" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  tab === t.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {tab === "schedule" && (
              <>
                <button
                  onClick={() => setYear((y) => y - 1)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  ←
                </button>
                <span className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-semibold text-white">
                  Mar {year} – {lastMonth.label} {lastMonth.calendarYear}
                </span>
                <button
                  onClick={() => setYear((y) => y + 1)}
                  className="rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                >
                  →
                </button>
              </>
            )}
            {isManager && tab === "customers" && (
              <button
                onClick={openAddCustomer}
                className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-800"
              >
                + Add customer
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-sm text-zinc-500">Loading...</div>
        ) : tab === "customers" ? (
          /* ── Customers ─────────────────────────────────────── */
          customers.length === 0 ? (
            <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-center text-sm text-zinc-500 shadow-sm">
              No customers yet.{isManager ? " Click “+ Add customer” to add the first one." : ""}
            </div>
          ) : (
            <div className="space-y-3">
              {customers.map((c) => {
                const custOrders = ordersByCustomer.get(c.id) ?? [];
                const live = custOrders.filter((o) => o.status !== "cancelled");
                const committed = live.reduce((sum, o) => sum + (resolveOrderKg(o) ?? 0), 0);
                const isOpen = openCustomerId === c.id;
                return (
                  <div key={c.id} className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
                    <button
                      onClick={() => setOpenCustomerId(isOpen ? null : c.id)}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-zinc-50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold">{c.name}</p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {[c.contact_name, c.phone, c.email].filter(Boolean).join(" · ") || "No contact details"}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="text-xs text-zinc-500">
                          {live.length} order{live.length === 1 ? "" : "s"}
                        </span>
                        {committed > 0 && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                            {fmtKg(committed)}
                          </span>
                        )}
                        <span className="text-xs text-zinc-400">{isOpen ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isOpen && (
                      <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                        <div className="mb-3 grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                          <p className="text-zinc-600"><span className="text-zinc-400">Contact:</span> {c.contact_name || "—"}</p>
                          <p className="text-zinc-600">
                            <span className="text-zinc-400">Phone:</span>{" "}
                            {c.phone ? <a href={`tel:${c.phone}`} className="underline">{c.phone}</a> : "—"}
                          </p>
                          <p className="truncate text-zinc-600">
                            <span className="text-zinc-400">Email:</span>{" "}
                            {c.email ? <a href={`mailto:${c.email}`} className="underline">{c.email}</a> : "—"}
                          </p>
                        </div>
                        {c.notes && <p className="mb-3 text-sm text-zinc-500">{c.notes}</p>}

                        {custOrders.length === 0 ? (
                          <p className="mb-3 text-sm text-zinc-400">No orders yet.</p>
                        ) : (
                          <table className="mb-3 w-full text-xs">
                            <thead>
                              <tr className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500">
                                <th className="py-1.5 text-left">Crop &amp; month</th>
                                <th className="py-1.5 text-left">Order</th>
                                <th className="py-1.5 text-right">Expected</th>
                                <th className="py-1.5 text-left pl-3">Status</th>
                                {isManager && <th className="py-1.5" />}
                              </tr>
                            </thead>
                            <tbody>
                              {custOrders.map((o) => {
                                const kg = resolveOrderKg(o);
                                return (
                                  <tr key={o.id} className="border-t border-zinc-200/70">
                                    <td className="py-1.5 pr-3 font-medium">{orderLine(o)}</td>
                                    <td className="py-1.5 pr-3 text-zinc-500">
                                      {o.quantity_kg !== null ? `${o.quantity_kg} kg` : `${o.share_pct}% of harvest`}
                                      {o.price_per_kg !== null && <span className="text-zinc-400"> · {o.price_per_kg}/kg</span>}
                                    </td>
                                    <td className={`py-1.5 text-right font-medium ${kg === null ? "text-amber-700" : "text-emerald-700"}`}>
                                      {kg === null ? "no estimate yet" : fmtKg(kg)}
                                    </td>
                                    <td className="py-1.5 pl-3">
                                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[o.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                                        {o.status}
                                      </span>
                                    </td>
                                    {isManager && (
                                      <td className="py-1.5 text-right whitespace-nowrap">
                                        <button onClick={() => openEditOrder(c, o)} className="rounded-lg border border-zinc-200 px-2 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-white">Edit</button>
                                        <button
                                          onClick={() => deleteOrder(o.id)}
                                          disabled={deletingId === o.id}
                                          className="ml-1 rounded-lg border border-rose-200 px-2 py-1 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                                        >
                                          {deletingId === o.id ? "…" : "Del"}
                                        </button>
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}

                        {isManager && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => openAddOrder(c)}
                              className="rounded-2xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800"
                            >
                              + Add order
                            </button>
                            <button
                              onClick={() => openEditCustomer(c)}
                              className="rounded-2xl border border-zinc-200 bg-white px-4 py-2 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                            >
                              Edit customer
                            </button>
                            <button
                              onClick={() => deleteCustomer(c)}
                              disabled={deletingId === c.id}
                              className="rounded-2xl border border-rose-200 bg-white px-4 py-2 text-xs font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            >
                              {deletingId === c.id ? "Removing…" : "Remove customer"}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          /* ── Expected & ordered ────────────────────────────── */
          <div>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Expected</p>
                <p className="mt-1 text-3xl font-semibold text-emerald-900">
                  {fmtKg(schedule.reduce((sum, s) => sum + s.expected, 0))}
                </p>
                <p className="mt-1 text-xs text-emerald-700">over the window</p>
              </div>
              <div className="rounded-3xl border border-blue-200 bg-blue-50/60 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">Ordered</p>
                <p className="mt-1 text-3xl font-semibold text-blue-900">{fmtKg(totalCommitted)}</p>
                <p className="mt-1 text-xs text-blue-700">
                  {liveOrders.length} live order{liveOrders.length === 1 ? "" : "s"}
                </p>
              </div>
              <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Unsold</p>
                <p className="mt-1 text-3xl font-semibold">
                  {fmtKg(Math.max(0, schedule.reduce((sum, s) => sum + s.expected, 0) - totalCommitted))}
                </p>
                <p className="mt-1 text-xs text-zinc-500">expected minus ordered</p>
              </div>
            </div>

            {unscheduled.length > 0 && (
              <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {unscheduled.length} order{unscheduled.length === 1 ? "" : "s"} with no month set — they do not appear
                in the schedule below. Edit them on the Customers tab to say when they are due.
              </div>
            )}

            <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
              {schedule.map((s) => {
                const over = s.committed > s.expected && s.expected > 0;
                const isEmpty = s.orders.length === 0 && s.expected === 0;
                return (
                  <div key={monthId(s.month)} className="border-b border-zinc-100 px-5 py-3.5 last:border-b-0">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <span className={`w-24 text-sm font-semibold ${isEmpty ? "text-zinc-400" : "text-zinc-900"}`}>
                          {s.month.label} {s.month.calendarYear}
                        </span>
                        {s.orders.length > 0 && (
                          <span className="text-xs text-zinc-500">
                            {s.orders.length} order{s.orders.length === 1 ? "" : "s"}
                          </span>
                        )}
                        {over && (
                          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-700">
                            oversold by {fmtKg(s.committed - s.expected)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-zinc-500">
                          expected <span className="font-semibold text-emerald-700">{s.expected > 0 ? fmtKg(s.expected) : "—"}</span>
                        </span>
                        <span className="text-zinc-500">
                          ordered <span className={`font-semibold ${over ? "text-rose-700" : "text-blue-700"}`}>{s.committed > 0 ? fmtKg(s.committed) : "—"}</span>
                        </span>
                      </div>
                    </div>

                    {s.orders.length > 0 && (
                      <table className="mt-2 w-full text-xs">
                        <tbody>
                          {s.orders.map((o) => {
                            const customer = customers.find((c) => c.id === o.customer_id);
                            const kg = resolveOrderKg(o);
                            return (
                              <tr key={o.id} className="border-t border-zinc-100">
                                <td className="py-1.5 pr-3 font-medium">{customer?.name ?? "Unknown customer"}</td>
                                <td className="py-1.5 pr-3 text-zinc-500">{orderLine(o)}</td>
                                <td className="py-1.5 pr-3 text-zinc-500">
                                  {o.quantity_kg !== null ? `${o.quantity_kg} kg` : `${o.share_pct}%`}
                                </td>
                                <td className={`py-1.5 text-right font-medium ${kg === null ? "text-amber-700" : "text-blue-700"}`}>
                                  {kg === null ? "no estimate yet" : fmtKg(kg)}
                                </td>
                                <td className="py-1.5 pl-3 text-right">
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLES[o.status] ?? "bg-zinc-100 text-zinc-600"}`}>
                                    {o.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    {s.unresolved > 0 && (
                      <p className="mt-1.5 text-xs text-amber-700">
                        {s.unresolved} order{s.unresolved === 1 ? "" : "s"} here take a share of a crop with no estimate
                        on the Harvest ETA sheet yet, so they are not counted.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-zinc-400">
              Expected weights come from the Harvest ETA sheet. A share order is worked out against its crop&rsquo;s
              estimate for that month, so it moves as the estimate does.
            </p>
          </div>
        )}
      </div>

      {/* Customer modal */}
      {isManager && customerModal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-5 text-lg font-semibold">
              {customerModal === "new" ? "Add customer" : `Edit — ${customerModal.name}`}
            </h2>
            <div className="space-y-3">
              <Field label="Name *">
                <input className={inp} value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} placeholder="Green Grocer Ltd" />
              </Field>
              <Field label="Contact person">
                <input className={inp} value={customerForm.contact_name} onChange={(e) => setCustomerForm((p) => ({ ...p, contact_name: e.target.value }))} placeholder="Jane Doe" />
              </Field>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Telephone">
                  <input className={inp} type="tel" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} placeholder="+254…" />
                </Field>
                <Field label="Email">
                  <input className={inp} type="email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} placeholder="orders@example.com" />
                </Field>
              </div>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[60px]`} value={customerForm.notes} onChange={(e) => setCustomerForm((p) => ({ ...p, notes: e.target.value }))} />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={saveCustomer} disabled={saving || !customerForm.name.trim()} className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setCustomerModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order modal */}
      {isManager && orderModal !== null && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-6 shadow-xl">
            <h2 className="mb-1 text-lg font-semibold">
              {orderModal.order ? "Edit order" : "Add order"} — {orderModal.customer.name}
            </h2>
            <p className="mb-5 text-sm text-zinc-500">
              Order a share of what a crop is expected to yield in a month, or a fixed weight.
            </p>
            <div className="space-y-3">
              <Field label="Crop">
                <select className={inp} value={orderForm.crop_id} onChange={(e) => setOrderForm((p) => ({ ...p, crop_id: e.target.value }))}>
                  <option value="">— Any / not tied to a crop —</option>
                  {crops.map((c) => (
                    <option key={c.id} value={c.id}>
                      {cropLabel(c)}
                      {c.zone_ids?.length ? ` (${c.zone_ids.map((zid) => bedLabel(zones.find((z) => z.id === zid))).filter(Boolean).join(", ")})` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Expected in">
                <select className={inp} value={orderForm.monthId} onChange={(e) => setOrderForm((p) => ({ ...p, monthId: e.target.value }))}>
                  <option value="">— No month set —</option>
                  {months.map((m) => (
                    <option key={monthId(m)} value={monthId(m)}>
                      {m.label} {m.calendarYear}
                    </option>
                  ))}
                </select>
              </Field>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-600">Order size</label>
                <div className="mb-2 flex rounded-full border border-zinc-200 bg-white p-1">
                  {[
                    { key: "share" as const, label: "% of harvest" },
                    { key: "fixed" as const, label: "Fixed kg" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => setOrderForm((p) => ({ ...p, basis: opt.key }))}
                      className={`flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                        orderForm.basis === opt.key ? "bg-zinc-900 text-white" : "text-zinc-600 hover:bg-zinc-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {orderForm.basis === "share" ? (
                  <input
                    className={inp}
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={orderForm.share_pct}
                    onChange={(e) => setOrderForm((p) => ({ ...p, share_pct: e.target.value }))}
                    placeholder="% of that month's harvest, e.g. 25"
                  />
                ) : (
                  <input
                    className={inp}
                    type="number"
                    min="0"
                    step="0.1"
                    value={orderForm.quantity_kg}
                    onChange={(e) => setOrderForm((p) => ({ ...p, quantity_kg: e.target.value }))}
                    placeholder="kilos, e.g. 40"
                  />
                )}
                <div className="mt-2 rounded-xl bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  {orderForm.basis === "share" && previewExpected === null && orderForm.crop_id && orderForm.monthId ? (
                    <>No estimate on the Harvest ETA sheet for that crop and month yet — the order saves, but its weight stays unknown until one is added.</>
                  ) : previewKg !== null ? (
                    <>
                      Comes to <span className="font-semibold text-zinc-900">{fmtKg(previewKg)}</span>
                      {orderForm.basis === "share" && previewExpected !== null && <> of {fmtKg(previewExpected)} expected</>}
                      {orderForm.price_per_kg.trim() && Number.isFinite(Number(orderForm.price_per_kg)) && (
                        <> · {(previewKg * Number(orderForm.price_per_kg)).toLocaleString(undefined, { maximumFractionDigits: 2 })} at {orderForm.price_per_kg}/kg</>
                      )}
                    </>
                  ) : (
                    <>Pick a crop, a month and an amount to see what it comes to.</>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Price per kg">
                  <input className={inp} type="number" min="0" step="0.01" value={orderForm.price_per_kg} onChange={(e) => setOrderForm((p) => ({ ...p, price_per_kg: e.target.value }))} placeholder="Optional" />
                </Field>
                <Field label="Status">
                  <select className={inp} value={orderForm.status} onChange={(e) => setOrderForm((p) => ({ ...p, status: e.target.value }))}>
                    {ORDER_STATUSES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="Notes">
                <textarea className={`${inp} min-h-[60px]`} value={orderForm.notes} onChange={(e) => setOrderForm((p) => ({ ...p, notes: e.target.value }))} />
              </Field>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                onClick={saveOrder}
                disabled={saving || !(orderForm.basis === "share" ? orderForm.share_pct.trim() : orderForm.quantity_kg.trim())}
                className="rounded-2xl bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save order"}
              </button>
              <button onClick={() => setOrderModal(null)} className="rounded-2xl border border-zinc-200 px-5 py-2.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
