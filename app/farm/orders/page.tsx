"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getCrops, getCustomerOrders, getCustomers, getFarms, ORDER_STATUSES } from "@/lib/farm";
import type { Crop, Customer, CustomerOrder, Farm } from "@/lib/farm";
import { useFarmSelection } from "@/hooks/useFarmSelection";
import { useFarmRole } from "@/hooks/useFarmRole";

const LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  growing: "Growing",
  ready: "Ready",
  collected: "Collected",
  cancelled: "Cancelled",
};
const STYLES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  confirmed: "bg-emerald-50 text-emerald-800 border-emerald-200",
  growing: "bg-lime-50 text-lime-800 border-lime-200",
  ready: "bg-blue-50 text-blue-800 border-blue-200",
  collected: "bg-violet-50 text-violet-800 border-violet-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

type Group = {
  key: string;
  reference: string;
  rows: CustomerOrder[];
  customer: Customer | undefined;
  status: string;
  createdAt: string | null;
};

function nextStatus(status: string): string | null {
  const flow = ["pending", "confirmed", "growing", "ready", "collected"];
  const index = flow.indexOf(status);
  return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
}
function cropName(crop: Crop | undefined) {
  if (!crop) return "Produce";
  return crop.crop_name + (crop.variety ? " · " + crop.variety : "");
}
function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";
}

export default function OrdersPage() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmId] = useState("");
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [filter, setFilter] = useState("open");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  useFarmSelection({ farms, activeFarmId, setActiveFarmId });
  const { isManager } = useFarmRole(activeFarmId);

  useEffect(() => {
    getFarms().then(setFarms).catch(() => setError("Could not load farms.")).finally(() => setLoading(false));
  }, []);

  async function load(farmId: string) {
    const [orderRows, customerRows, cropRows] = await Promise.all([
      getCustomerOrders(farmId), getCustomers(farmId), getCrops(farmId),
    ]);
    setOrders(orderRows); setCustomers(customerRows); setCrops(cropRows);
  }

  useEffect(() => {
    if (!activeFarmId) return;
    setLoading(true);
    load(activeFarmId).catch(() => setError("Could not load orders.")).finally(() => setLoading(false));
  }, [activeFarmId]);

  const groups = useMemo(() => {
    const map = new Map<string, CustomerOrder[]>();
    for (const order of orders) {
      const key = order.reservation_id || order.id;
      map.set(key, [...(map.get(key) ?? []), order]);
    }
    return Array.from(map.entries()).map(([key, rows]): Group => ({
      key,
      reference: rows[0].reservation_reference || "Farm order",
      rows,
      customer: customers.find((c) => c.id === rows[0].customer_id),
      status: rows.every((r) => r.status === rows[0].status) ? rows[0].status : "mixed",
      createdAt: rows[0].created_at,
    }));
  }, [orders, customers]);

  const shown = groups.filter((group) => {
    if (filter === "all") return true;
    if (filter === "open") return !group.rows.every((r) => r.status === "collected" || r.status === "cancelled");
    return group.rows.some((r) => r.status === filter);
  });

  async function setGroupStatus(group: Group, status: string) {
    if (!isManager) return;
    try {
      setSaving(group.key); setError("");
      let query = supabase.from("customer_orders").update({ status });
      query = group.rows[0].reservation_id
        ? query.eq("reservation_id", group.rows[0].reservation_id)
        : query.eq("id", group.rows[0].id);
      const { error: updateError } = await query;
      if (updateError) throw updateError;
      await load(activeFarmId);
    } catch {
      setError("Could not update this reservation.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <main className="min-h-screen bg-stone-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Shamba Farm Manager</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">Orders</h1>
              <p className="mt-1 text-sm text-zinc-500">Confirm, prepare and complete produce reservations.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {farms.map((farm) => (
                <button key={farm.id} onClick={() => setActiveFarmId(farm.id)} className={"rounded-full px-4 py-2 text-sm font-medium " + (farm.id === activeFarmId ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-700")}>{farm.name}</button>
              ))}
              <Link href="/farm/customers" className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium">Customers</Link>
              <Link href="/farm" className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-medium">← Farm</Link>
            </div>
          </div>
        </header>

        {error && <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div className="mb-4 flex flex-wrap gap-2">
          {["open", ...ORDER_STATUSES, "all"].map((value) => (
            <button key={value} onClick={() => setFilter(value)} className={"rounded-full px-4 py-2 text-xs font-semibold " + (filter === value ? "bg-zinc-900 text-white" : "border border-zinc-200 bg-white text-zinc-600")}>{value === "open" ? "Open" : value === "all" ? "All" : LABELS[value]}</button>
          ))}
        </div>

        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-8 text-sm text-zinc-500">Loading orders…</div>
        ) : shown.length === 0 ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-10 text-center text-sm text-zinc-500">No orders in this view.</div>
        ) : (
          <div className="space-y-4">
            {shown.map((group) => {
              const next = nextStatus(group.status);
              const estimatedKg = group.rows.reduce((sum, row) => sum + (row.quantity_kg ?? 0), 0);
              return (
                <article key={group.key} className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{group.reference}</h2>
                        <span className={"rounded-full border px-2.5 py-1 text-xs font-semibold " + (STYLES[group.status] ?? "border-zinc-200 bg-zinc-50 text-zinc-600")}>{LABELS[group.status] ?? "Mixed status"}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-600">{group.customer?.name ?? "Unknown customer"}</p>
                      <p className="mt-1 text-xs text-zinc-400">{[group.customer?.contact_name, group.customer?.phone, group.customer?.email].filter(Boolean).join(" · ") || "No contact details"} · {fmtDate(group.createdAt)}</p>
                    </div>
                    {isManager && (
                      <div className="flex flex-wrap gap-2">
                        {next && <button disabled={saving === group.key} onClick={() => setGroupStatus(group, next)} className="rounded-full bg-emerald-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Move to {LABELS[next]}</button>}
                        {group.status !== "cancelled" && group.status !== "collected" && <button disabled={saving === group.key} onClick={() => setGroupStatus(group, "cancelled")} className="rounded-full border border-rose-200 px-4 py-2 text-xs font-semibold text-rose-700 disabled:opacity-50">Cancel</button>}
                      </div>
                    )}
                  </div>
                  <div className="mt-4 divide-y divide-zinc-100 rounded-2xl border border-zinc-100 bg-zinc-50/50">
                    {group.rows.map((row) => (
                      <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                        <span className="font-medium">{cropName(crops.find((c) => c.id === row.crop_id))}</span>
                        <span className="text-zinc-500">{row.quantity_kg !== null ? String(row.quantity_kg) + " kg" : String(row.share_pct) + "%"}{row.actual_quantity_kg !== null ? " · final " + row.actual_quantity_kg + " kg" : ""}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-zinc-500">{estimatedKg > 0 ? String(estimatedKg) + " kg estimated" : "Share order"}</p>
                    <Link href="/farm/customers" className="text-sm font-semibold text-emerald-700">Edit weights and prices →</Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
