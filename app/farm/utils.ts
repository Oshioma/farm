export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatMoney(value: number) {
  return `TZS ${value.toLocaleString()}`;
}

export function badgeClass(status?: string | null) {
  switch (status) {
    case "done":
    case "harvested":
      return "bg-emerald-100 text-emerald-700";
    case "in_progress":
    case "growing":
    case "germinating":
      return "bg-blue-100 text-blue-700";
    case "harvest_ready":
      return "bg-amber-100 text-amber-700";
    case "failed":
    case "cancelled":
      return "bg-rose-100 text-rose-700";
    case "planned":
    case "planted":
    case "todo":
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}
