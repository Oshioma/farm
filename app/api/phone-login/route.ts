import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkPin, isPin, signInUrl, userExists } from "@/lib/phone-accounts";
import { normalisePhone } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/* Public: phone number + 4-digit PIN for farmers who signed up through
   WhatsApp and have no email or password. A correct PIN returns a one-time
   sign-in URL (the same magic-link hop the setup link uses); wrong PINs count
   towards a lockout kept in farmer_pins. */

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const sw = body.lang !== "en";
  const phone = normalisePhone(String(body.phone ?? ""));
  const pin = String(body.pin ?? "");
  const next = String(body.next ?? "/farm");

  if (!/^\d{9,15}$/.test(phone) || !isPin(pin)) {
    return NextResponse.json(
      { error: sw ? "Andika namba ya simu na PIN ya tarakimu 4." : "Enter your phone number and 4-digit PIN." },
      { status: 400 }
    );
  }

  const admin = getSupabaseAdmin();
  try {
    const result = await checkPin(admin, phone, pin);
    if (!result.ok) {
      if (result.reason === "locked") {
        return NextResponse.json(
          { error: sw ? `Umekosea PIN mara nyingi. Jaribu tena baada ya dakika ${result.minutes}.` : `Too many wrong PINs. Try again in ${result.minutes} minutes.` },
          { status: 429 }
        );
      }
      if (result.reason === "no_pin") {
        return NextResponse.json(
          {
            code: "no_pin",
            error: sw
              ? "Namba hii haina PIN bado. Fungua kiungo cha WhatsApp ulichotumiwa ili kuweka PIN, au jisajili."
              : "This number has no PIN yet. Open the WhatsApp link you were sent to set one, or sign up.",
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: sw ? "Namba au PIN si sahihi." : "Wrong number or PIN." }, { status: 401 });
    }

    if (!(await userExists(admin, result.userId))) {
      return NextResponse.json({ error: sw ? "Akaunti hii haipo tena." : "This account no longer exists." }, { status: 404 });
    }
    const url = await signInUrl(admin, result.userId, req.nextUrl.origin, next);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[phone-login] failed:", err);
    return NextResponse.json({ error: sw ? "Kuna hitilafu imetokea. Tafadhali jaribu tena." : "Something went wrong. Please try again." }, { status: 500 });
  }
}
