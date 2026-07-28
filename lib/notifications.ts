import { supabase } from "@/lib/supabase";

// In-app notifications for the bell in the farm dashboard header. Rows are
// created by database triggers (see migrations/create_notifications.sql); the
// client only ever reads its own (RLS scopes every query to the recipient) and
// marks them read.

export type FarmNotification = {
  id: string;
  recipient_id: string;
  farm_id: string | null;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  actor_id: string | null;
  read: boolean;
  created_at: string;
};

export async function getNotifications(limit = 15): Promise<FarmNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as FarmNotification[];
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markNotificationsRead(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { error } = await supabase.from("notifications").update({ read: true }).in("id", ids);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase.from("notifications").update({ read: true }).eq("read", false);
  if (error) throw error;
}
