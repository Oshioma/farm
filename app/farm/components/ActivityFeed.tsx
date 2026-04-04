import type { Activity } from "@/lib/farm";
import { formatDate } from "@/app/farm/utils";

type Props = {
  activities: Activity[];
};

export function ActivityFeed({ activities }: Props) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-zinc-500">Recent activity</h2>

      {activities.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No activity yet.</p>
      ) : (
        <div className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {activities.map((item) => (
            <div key={item.id} className="flex items-baseline gap-2 py-1 text-sm">
              <span className="font-medium truncate">{item.title}</span>
              <span className="shrink-0 text-xs text-zinc-400">{formatDate(item.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
