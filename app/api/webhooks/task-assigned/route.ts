import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { sendEmail } from "@/lib/email";
import { sw } from "@/lib/i18n/sw";

type Lang = "en" | "sw";

/* Email copy in the language the assignee chose in the app (saved on their
   account as user_metadata.lang). */
const copy = {
  en: {
    subject: (title: string) => `New goal for you: ${title}`,
    introBy: (actor: string) => `${actor} assigned you a goal`,
    intro: "You were assigned a goal",
    on: (farm: string) => ` on ${farm}`,
    due: "Due",
    date: "Date",
    priority: "Priority",
    category: "Category",
    crop: "Crop",
    bed: "Bed",
    button: "Open the goal",
    fallback: "If the button doesn't open, copy this link into your browser:",
  },
  sw: {
    subject: (title: string) => `Lengo jipya kwako: ${title}`,
    introBy: (actor: string) => `${actor} amekupa lengo`,
    intro: "Umepewa lengo",
    on: (farm: string) => ` kwenye ${farm}`,
    due: "Mwisho",
    date: "Tarehe",
    priority: "Kipaumbele",
    category: "Aina",
    crop: "Zao",
    bed: "Tuta",
    button: "Fungua lengo",
    fallback: "Kama kitufe hakifunguki, nakili kiungo hiki kwenye kivinjari chako:",
  },
} as const;

/* App values such as priority "high" read in the assignee's language. */
function word(lang: Lang, value: string): string {
  return lang === "sw" ? sw[value] ?? value : value;
}

/* Called by the database (trigger trg_email_task_assigned) whenever a
   'task_assigned' notification is written, i.e. someone was assigned a goal or
   a lunar planner task by somebody else. Emails the assignee. */

type NotificationRecord = {
  recipient_id?: string;
  farm_id?: string | null;
  type?: string;
  title?: string;
  link?: string | null;
  actor_id?: string | null;
};

/* Accounts made from a WhatsApp number get a placeholder address that cannot
   receive mail (see lib/phone-accounts). */
const PLACEHOLDER_DOMAIN = "@farmers.shamba.online";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function siteOrigin(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://www.shamba.online").replace(/\/+$/, "");
}

/* "2026-10-30" -> "Fri 30 Oct 2026" / "Ijumaa, 30 Okt 2026" */
function formatDue(date: string | null | undefined, lang: Lang): string | null {
  if (!date) return null;
  const d = new Date(`${date.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(lang === "sw" ? "sw" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

type Detail = { label: string; value: string };

function renderEmail(input: {
  lang: Lang;
  taskTitle: string;
  actorName: string | null;
  farmName: string | null;
  details: Detail[];
  description: string | null;
  link: string;
}) {
  const { lang, taskTitle, actorName, farmName, details, description, link } = input;
  const c = copy[lang];
  const subject = c.subject(taskTitle);
  const intro = (actorName ? c.introBy(actorName) : c.intro) + (farmName ? c.on(farmName) : "") + ".";
  const safeLink = escapeHtml(link);
  const detailRows = details
    .map(
      (d) =>
        `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#78716c;white-space:nowrap">${escapeHtml(d.label)}</td><td style="padding:4px 0;font-size:14px">${escapeHtml(d.value)}</td></tr>`
    )
    .join("");
  const html = `
<div style="background:#faf7f2;padding:32px 16px;font-family:Karla,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d5;border-radius:24px;padding:32px">
    <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#78716c">Shamba Online</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.5">${escapeHtml(intro)}</p>
    <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;letter-spacing:-0.02em">${escapeHtml(taskTitle)}</h1>
    ${description ? `<p style="margin:0 0 16px;font-size:15px;line-height:1.5;white-space:pre-line">${escapeHtml(description)}</p>` : ""}
    ${detailRows ? `<table style="border-collapse:collapse;margin:0 0 24px">${detailRows}</table>` : ""}
    <p style="margin:0 0 24px">
      <a href="${safeLink}" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px">${escapeHtml(c.button)}</a>
    </p>
    <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#78716c">${escapeHtml(c.fallback)}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${safeLink}" style="color:#166534">${safeLink}</a></p>
  </div>
</div>`;
  const text = [
    intro,
    "",
    taskTitle,
    description ?? "",
    ...details.map((d) => `${d.label}: ${d.value}`),
    "",
    `${c.button}: ${link}`,
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n");
  return { subject, html, text };
}

export async function POST(req: NextRequest) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let record: NotificationRecord;
  try {
    record = ((await req.json()) as { record?: NotificationRecord }).record ?? {};
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (record.type !== "task_assigned" || !record.recipient_id) {
    return NextResponse.json({ ok: true, skipped: "not an assignment" });
  }

  const admin = getSupabaseAdmin();

  const { data: recipient } = await admin.auth.admin.getUserById(record.recipient_id);
  const to = recipient?.user?.email?.trim().toLowerCase();
  if (!to || to.endsWith(PLACEHOLDER_DOMAIN)) {
    return NextResponse.json({ ok: true, skipped: "no email address" });
  }
  const lang: Lang = recipient?.user?.user_metadata?.lang === "sw" ? "sw" : "en";
  const c = copy[lang];

  /* The notification links to the task: /farm?task=<id> for goals,
     /lunar-planner?task=<id> for lunar planner tasks. */
  const link = record.link || "/farm";
  const taskId = new URL(link, "https://x").searchParams.get("task");
  const isLunar = link.startsWith("/lunar-planner");

  let taskTitle = (record.title ?? "").replace(/^You were assigned a task:\s*/, "") || "Untitled";
  let description: string | null = null;
  const details: Detail[] = [];
  if (taskId) {
    if (isLunar) {
      const { data } = await admin.from("lunar_tasks").select("title, notes, date, category").eq("id", taskId).maybeSingle();
      if (data) {
        taskTitle = data.title || taskTitle;
        description = data.notes || null;
        const due = formatDue(data.date, lang);
        if (due) details.push({ label: c.date, value: due });
        if (data.category) details.push({ label: c.category, value: word(lang, String(data.category)) });
      }
    } else {
      const { data } = await admin
        .from("tasks")
        .select("title, description, due_date, due_time, priority, goal_timeframe, crop:crops(crop_name), zone:zones(name)")
        .eq("id", taskId)
        .maybeSingle();
      if (data) {
        taskTitle = data.title || taskTitle;
        description = data.description || null;
        const due = formatDue(data.due_date, lang);
        if (due) details.push({ label: c.due, value: data.due_time ? `${due}, ${String(data.due_time).slice(0, 5)}` : due });
        if (data.priority) details.push({ label: c.priority, value: word(lang, String(data.priority)) });
        const crop = (data.crop as { crop_name?: string } | { crop_name?: string }[] | null);
        const cropName = Array.isArray(crop) ? crop[0]?.crop_name : crop?.crop_name;
        if (cropName) details.push({ label: c.crop, value: cropName });
        const zone = (data.zone as { name?: string } | { name?: string }[] | null);
        const zoneName = Array.isArray(zone) ? zone[0]?.name : zone?.name;
        if (zoneName) details.push({ label: c.bed, value: zoneName });
      }
    }
  }

  let actorName: string | null = null;
  if (record.actor_id) {
    const { data: actor } = await admin.auth.admin.getUserById(record.actor_id);
    const meta = (actor?.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
    const email = actor?.user?.email ?? "";
    actorName = meta.full_name || meta.name || (email && !email.endsWith(PLACEHOLDER_DOMAIN) ? email : null);
  }

  let farmName: string | null = null;
  if (record.farm_id) {
    const { data: farm } = await admin.from("farms").select("name").eq("id", record.farm_id).maybeSingle();
    farmName = farm?.name ?? null;
  }

  const message = renderEmail({ lang, taskTitle, actorName, farmName, details, description, link: `${siteOrigin()}${link}` });
  const { error } = await sendEmail({ to, ...message });
  if (error) {
    console.error("[task-assigned] email failed:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
