import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

const STATUS_ORDER = ["pending", "confirmed", "growing", "ready", "collected"] as const;
const LABELS: Record<string, string> = {
  pending: "Waiting for the farm",
  confirmed: "Confirmed",
  growing: "Growing",
  ready: "Ready for collection",
  collected: "Collected",
  cancelled: "Cancelled",
};

type OrderRow = {
  id: string; crop_id: string | null; season: number | null; month_key: string | null;
  quantity_kg: number | null; price_per_kg: number | null;
  actual_quantity_kg: number | null; actual_price_per_kg: number | null;
  status: string; notes: string | null; reservation_reference: string | null;
  farm_id: string; customer_id: string; created_at: string | null;
};

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
function money(value: number) {
  return "TZS " + Math.round(value).toLocaleString();
}

export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("customer_orders")
    .select("id, crop_id, season, month_key, quantity_kg, price_per_kg, actual_quantity_kg, actual_price_per_kg, status, notes, reservation_reference, farm_id, customer_id, created_at")
    .eq("tracking_token", token)
    .order("created_at", { ascending: true });

  const orders = (data ?? []) as OrderRow[];
  if (error || orders.length === 0) notFound();

  const first = orders[0];
  const cropIds = orders.map((o) => o.crop_id).filter(Boolean) as string[];
  const [{ data: farm }, { data: customer }, { data: crops }] = await Promise.all([
    admin.from("farms").select("name, location, shop_contact_phone, fulfilment_method, collection_instructions, delivery_area").eq("id", first.farm_id).single(),
    admin.from("customers").select("name, contact_name").eq("id", first.customer_id).single(),
    cropIds.length
      ? admin.from("crops").select("id, crop_name, variety").in("id", cropIds)
      : Promise.resolve({ data: [] }),
  ]);

  const cropMap = new Map(
    (crops ?? []).map((crop: { id: string; crop_name: string; variety: string | null }) => [
      crop.id,
      crop.crop_name + (crop.variety ? " · " + crop.variety : ""),
    ])
  );
  const cancelled = orders.every((o) => o.status === "cancelled");
  const currentIndex = Math.max(0, ...orders.filter((o) => o.status !== "cancelled").map((o) => STATUS_ORDER.indexOf(o.status as (typeof STATUS_ORDER)[number])));
  const finalTotal = orders.reduce((sum, o) => {
    const kg = o.actual_quantity_kg ?? o.quantity_kg ?? 0;
    const price = o.actual_price_per_kg ?? o.price_per_kg ?? 0;
    return sum + kg * price;
  }, 0);

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-zinc-900 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="rounded-3xl bg-emerald-950 p-6 text-white sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Shamba Online</p>
          <h1 className="mt-2 text-3xl font-semibold">Your produce reservation</h1>
          <p className="mt-2 text-emerald-100">
            {farm?.name ?? "Farm"}{farm?.location ? " · " + farm.location : ""}
          </p>
          {first.reservation_reference && <p className="mt-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-semibold tracking-wide">{first.reservation_reference}</p>}
        </header>

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-zinc-500">Reserved for {customer?.contact_name || customer?.name || "customer"}</p>
          {cancelled ? (
            <div className="mt-4 rounded-2xl bg-zinc-100 p-4 font-semibold text-zinc-600">This reservation was cancelled.</div>
          ) : (
            <div className="mt-5 grid grid-cols-5 gap-1">
              {STATUS_ORDER.map((status, index) => (
                <div key={status} className="min-w-0 text-center">
                  <div className={"mx-auto h-2 rounded-full " + (index <= currentIndex ? "bg-emerald-600" : "bg-zinc-200")} />
                  <p className={"mt-2 text-[10px] sm:text-xs " + (index <= currentIndex ? "font-semibold text-emerald-800" : "text-zinc-400")}>{LABELS[status]}</p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 px-6 py-4"><h2 className="text-lg font-semibold">Reserved produce</h2></div>
          <div className="divide-y divide-zinc-100">
            {orders.map((order) => {
              const kg = order.actual_quantity_kg ?? order.quantity_kg;
              const price = order.actual_price_per_kg ?? order.price_per_kg;
              return (
                <article key={order.id} className="px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold">{order.crop_id ? cropMap.get(order.crop_id) ?? "Produce" : "Produce"}</h3>
                      <p className="mt-1 text-sm text-zinc-500">{[order.month_key ? titleCase(order.month_key) : null, order.season].filter(Boolean).join(" ")}</p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{LABELS[order.status] ?? titleCase(order.status)}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    <span>{kg !== null ? String(kg) + " kg" : "Weight to be confirmed"}</span>
                    <span className="text-zinc-500">{price !== null ? money(price) + " / kg" : "Price on collection"}</span>
                    {kg !== null && price !== null && <strong>{money(kg * price)}</strong>}
                  </div>
                  {order.notes && <p className="mt-2 text-sm text-zinc-500">{order.notes}</p>}
                </article>
              );
            })}
          </div>
        </section>

        {finalTotal > 0 && (
          <section className="flex items-center justify-between rounded-3xl bg-emerald-50 p-6 text-emerald-950">
            <span className="font-medium">Current total</span><strong className="text-2xl">{money(finalTotal)}</strong>
          </section>
        )}
        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Collection and delivery</h2>
          <p className="mt-2 text-sm font-medium text-emerald-800">
            {farm?.fulfilment_method === "delivery" ? "Delivery" : farm?.fulfilment_method === "both" ? "Collection or delivery" : "Collection"}
          </p>
          {farm?.collection_instructions && farm.fulfilment_method !== "delivery" && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{farm.collection_instructions}</p>}
          {farm?.delivery_area && farm.fulfilment_method !== "collection" && <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-600">{farm.delivery_area}</p>}
          {farm?.shop_contact_phone && (
            <a
              href={`https://wa.me/${farm.shop_contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, I am asking about reservation ${first.reservation_reference ?? ""}`)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex min-h-11 items-center rounded-full bg-green-500 px-5 py-3 text-sm font-semibold text-emerald-950"
            >
              Message the farm on WhatsApp
            </a>
          )}
        </section>
        <p className="px-4 text-center text-xs leading-5 text-zinc-500">Harvest dates and weights can change with the season. The farm confirms the final weight and collection arrangements.</p>
      </div>
    </main>
  );
}
