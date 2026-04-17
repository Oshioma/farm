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

type CsvValue = string | number | boolean | null | undefined;

function escapeCsv(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function toFileSlug(value?: string | null, fallback = "farm"): string {
  const normalized = (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

export function downloadCsvFile(filename: string, headers: string[], rows: CsvValue[][]): void {
  if (typeof window === "undefined" || rows.length === 0) return;

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
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
