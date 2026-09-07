import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { emailConfigured, sendEmail } from "@/lib/email";

/* Password reset, sent by the app rather than by Supabase.

   Supabase's own reset email arrives from a Supabase address, and its link
   carries a one-time code bound to the browser that asked for it: open it on
   another device, or after a mail scanner has followed it, and it reads as
   expired. Here we ask Supabase for the recovery token only, put it in our
   own link, and send the email ourselves. The reset page hands the token back
   to Supabase when the farmer submits the new password, so the link works
   from any device and nothing is spent by a scanner's visit. */

type Lang = "en" | "sw";

const copy: Record<Lang, { subject: string; greeting: string; intro: string; button: string; ignore: string; expires: string; fallback: string }> = {
  en: {
    subject: "Reset your Shamba Online password",
    greeting: "Hello,",
    intro: "Someone asked to reset the password for your Shamba Online account. Tap the button below to choose a new one.",
    button: "Set a new password",
    ignore: "If you did not ask for this, you can ignore this email. Your password stays as it is.",
    expires: "The link works for one hour.",
    fallback: "If the button does not open, copy this link into your browser:",
  },
  sw: {
    subject: "Weka upya nenosiri lako la Shamba Online",
    greeting: "Habari,",
    intro: "Mtu ameomba kuweka upya nenosiri la akaunti yako ya Shamba Online. Bofya kitufe hapa chini kuchagua nenosiri jipya.",
    button: "Weka nenosiri jipya",
    ignore: "Kama hukuomba hili, puuza barua pepe hii. Nenosiri lako linabaki vile lilivyo.",
    expires: "Kiungo hiki kinafanya kazi kwa saa moja.",
    fallback: "Kama kitufe hakifunguki, nakili kiungo hiki kwenye kivinjari chako:",
  },
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function renderEmail(lang: Lang, link: string): { subject: string; html: string; text: string } {
  const c = copy[lang];
  const safeLink = escapeHtml(link);
  const html = `
<div style="background:#faf7f2;padding:32px 16px;font-family:Karla,Helvetica,Arial,sans-serif;color:#1c1917">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e7e0d5;border-radius:24px;padding:32px">
    <p style="margin:0 0 20px;font-size:11px;font-weight:600;letter-spacing:0.18em;text-transform:uppercase;color:#78716c">Shamba Online</p>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;letter-spacing:-0.02em">${escapeHtml(c.subject)}</h1>
    <p style="margin:0 0 12px;font-size:15px;line-height:1.5">${escapeHtml(c.greeting)}</p>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.5">${escapeHtml(c.intro)}</p>
    <p style="margin:0 0 24px">
      <a href="${safeLink}" style="display:inline-block;background:#166534;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 24px;border-radius:999px">${escapeHtml(c.button)}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:#57534e">${escapeHtml(c.expires)}</p>
    <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#57534e">${escapeHtml(c.ignore)}</p>
    <p style="margin:0 0 4px;font-size:12px;line-height:1.5;color:#78716c">${escapeHtml(c.fallback)}</p>
    <p style="margin:0;font-size:12px;line-height:1.5;word-break:break-all"><a href="${safeLink}" style="color:#166534">${safeLink}</a></p>
  </div>
</div>`;
  const text = `${c.greeting}\n\n${c.intro}\n\n${c.button}: ${link}\n\n${c.expires}\n${c.ignore}\n`;
  return { subject: c.subject, html, text };
}

/* The public address of this deployment. Never taken from the Origin or Host
   header a caller can set, because the link in the email must point at us. */
function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  return new URL(request.url).origin;
}

/* One reset email per address per minute on this server instance. */
const recent = new Map<string, number>();

export async function POST(request: Request) {
  let body: { email?: unknown; lang?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const lang: Lang = body.lang === "sw" ? "sw" : "en";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
  }

  if (!emailConfigured()) {
    /* The page falls back to Supabase's own reset email in this case. */
    return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });
  }

  const now = Date.now();
  const last = recent.get(email) ?? 0;
  if (now - last < 60_000) return NextResponse.json({ ok: true, throttled: true });
  recent.set(email, now);

  const origin = siteOrigin(request);
  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (error) {
    console.error("[forgot-password] admin client unavailable:", error);
    return NextResponse.json({ error: "Email sending is not configured" }, { status: 503 });
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: `${origin}/reset-password` },
  });

  if (error) {
    /* An unknown address gets the same answer as a known one, so the form
       cannot be used to find out who has an account. */
    const notFound = /not found|no user|does not exist/i.test(error.message) || error.status === 404 || error.status === 422;
    if (notFound) return NextResponse.json({ ok: true });
    console.error("[forgot-password] generateLink failed:", error);
    return NextResponse.json({ error: "Could not create a reset link" }, { status: 500 });
  }

  const tokenHash = data?.properties?.hashed_token;
  if (!tokenHash) {
    console.error("[forgot-password] generateLink returned no token");
    return NextResponse.json({ error: "Could not create a reset link" }, { status: 500 });
  }

  const link = `${origin}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=recovery`;
  const message = renderEmail(lang, link);
  const sent = await sendEmail({ to: email, ...message });
  if (sent.error) {
    console.error("[forgot-password] send failed:", sent.error);
    return NextResponse.json({ error: "Could not send the reset email" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
