import { supabase } from "@/lib/supabase";
import { calcMoonPhase, fromISODate } from "@/app/lunar-planner/lunar-data";

type CreateLunarTaskParams = {
  farmId: string;
  date: string;
  title: string;
  category: string;
  cropOrActivity?: string | null;
  notes?: string | null;
};

// Creates a task on the shared Lunar Planner (the farm's team task list) for
// a given date, creating the underlying lunar_days row for that date first
// if one doesn't already exist yet for the signed-in user.
export async function createLunarTask({
  farmId,
  date,
  title,
  category,
  cropOrActivity,
  notes,
}: CreateLunarTaskParams): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data: dayRow, error: dayErr } = await supabase
    .from("lunar_days")
    .upsert(
      {
        user_id: user.id,
        date,
        calculated_moon_phase: calcMoonPhase(fromISODate(date)),
      },
      { onConflict: "user_id,date" }
    )
    .select("id")
    .single();
  if (dayErr) throw dayErr;

  const { error: taskErr } = await supabase.from("lunar_tasks").insert({
    user_id: user.id,
    farm_id: farmId,
    lunar_day_id: dayRow.id,
    date,
    title,
    category,
    crop_or_activity: cropOrActivity ?? null,
    notes: notes ?? null,
    status: "planned",
    reminder_status: "pending",
  });
  if (taskErr) throw taskErr;
}
