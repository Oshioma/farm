import type { Activity } from "@/lib/farm";
import { formatDate } from "@/app/farm/utils";

type Props = {
  activities: Activity[];
};

export function ActivityFeed({ activities }: Props) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Recent activity</h2>

      <div className="mt-5 space-y-4">
        {activities.length === 0 ? (
          <p className="text-sm text-zinc-500">No activity yet.</p>
        ) : (
          activities.map((item) => (
            <div
              key={item.id}
              className="border-b border-zinc-100 pb-4 last:border-b-0 last:pb-0"
            >
              <p className="font-medium">{item.title}</p>
              {item.meta ? (
                <p className="mt-1 text-sm text-zinc-500">{item.meta}</p>
              ) : null}
              <p className="mt-1 text-xs text-zinc-400">{formatDate(item.created_at)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
