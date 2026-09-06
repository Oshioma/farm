import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { TrackingView } from "./TrackingView";
import type { TrackedOrder } from "./TrackingView";

export const dynamic = "force-dynamic";

export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(token)) notFound();

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("customer_orders")
    .select("id, crop_id, season, month_key, quantity_kg, price_per_kg, actual_quantity_kg, actual_price_per_kg, status, notes, reservation_reference, farm_id, customer_id, created_at")
    .eq("tracking_token", token)
    .order("created_at", { ascending: true });

  const orders = (data ?? []) as TrackedOrder[];
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

  const cropNames: Record<string, string> = {};
  for (const crop of (crops ?? []) as { id: string; crop_name: string; variety: string | null }[]) {
    cropNames[crop.id] = crop.crop_name + (crop.variety ? " · " + crop.variety : "");
  }

  return <TrackingView orders={orders} farm={farm ?? null} customer={customer ?? null} cropNames={cropNames} />;
}
