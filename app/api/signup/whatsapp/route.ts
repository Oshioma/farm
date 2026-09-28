import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { existingUserForPhone } from "@/lib/phone-accounts";
import { normalisePhone } from "@/lib/whatsapp";
import type { InviteLang } from "@/lib/whatsapp";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/* Public: a farmer starts WhatsApp setup on their own from /jisajili. This
   makes the same whatsapp_invites row the admin page makes (source 'self')
   and hands back its token; the three setup questions at /start/[token] do
   the rest. Nothing is sent to the phone, so a number that already has an
   account is refused rather than reused: otherwise anyone could type a
   farmer's number and walk into their farm. */

const MAX_PER_DAY = 3;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const farmerName = String(body.farmerName ?? "").trim().slice(0, 120);
  const phone = normalisePhone(String(body.phone ?? ""));
  const lang: InviteLang = body.lang === "en" ? "en" : "sw";

  if (!farmerName) {
    return NextResponse.json({ error: lang === "sw" ? "Andika jina lako." : "Enter your name." }, { status: 400 });
  }
  if (!/^\d{9,15}$/.test(phone)) {
    return NextResponse.json(
      { error: lang === "sw" ? "Andika namba ya simu, mf. 0712 345 678." : "Enter your phone number, e.g. 0712 345 678." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  try {
    if (await existingUserForPhone(admin, phone)) {
      return NextResponse.json(
        {
          code: "exists",
          error: lang === "sw"
            ? "Namba hii tayari ina akaunti. Ingia kwa namba yako na PIN."
            : "This number already has an account. Sign in with your number and PIN.",
        },
        { status: 409 }
      );
    }

    // An invite sent from the admin page is how this farmer gets in; a second, self-made one would
    // let whoever typed the number first own the account that invite links to.
    const { count: invited } = await admin
      .from("whatsapp_invites")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("source", "admin");
    if ((invited ?? 0) > 0) {
      return NextResponse.json(
        {
          code: "invited",
          error: lang === "sw"
            ? "Namba hii tayari imetumiwa kiungo cha kujisajili kwenye WhatsApp. Fungua kiungo hicho."
            : "This number was already sent a sign-up link on WhatsApp. Open that link.",
        },
        { status: 409 }
      );
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("whatsapp_invites")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .eq("source", "self")
      .gte("created_at", since);
    if ((count ?? 0) >= MAX_PER_DAY) {
      return NextResponse.json(
        { error: lang === "sw" ? "Umejaribu mara nyingi leo. Jaribu tena kesho." : "Too many tries today. Please try again tomorrow." },
        { status: 429 }
      );
    }

    const { data, error } = await admin
      .from("whatsapp_invites")
      .insert({ farmer_name: farmerName, phone, lang, source: "self" })
      .select("token")
      .single();
    if (error) throw error;

    // Let the team know; a failed email never blocks the farmer.
    const notify = process.env.NOTIFY_EMAIL?.trim();
    if (notify) {
      const adminLink = `${req.nextUrl.origin}/admin`;
      await sendEmail({
        to: notify,
        subject: `New farmer signed up by WhatsApp: ${farmerName}`,
        text: `${farmerName} (+${phone}, ${lang === "sw" ? "Kiswahili" : "English"}) started farm setup on their own.\nTheir progress shows under WhatsApp invites: ${adminLink}`,
        html: `<p><strong>${escapeHtml(farmerName)}</strong> (+${phone}, ${lang === "sw" ? "Kiswahili" : "English"}) started farm setup on their own.</p><p>Their progress shows under WhatsApp invites on the <a href="${adminLink}">admin page</a>.</p>`,
      }).catch((err) => console.error("[signup/whatsapp] notify failed:", err));
    }

    return NextResponse.json({ token: data.token });
  } catch (err) {
    console.error("[signup/whatsapp] failed:", err);
    return NextResponse.json(
      { error: lang === "sw" ? "Kuna hitilafu imetokea. Tafadhali jaribu tena." : "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
