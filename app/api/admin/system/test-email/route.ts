import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { EMAIL_FROM, checkSender, sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

/* Sends one test email to the super admin and reports exactly what Resend
   said, so a refused sender can be diagnosed from the system page. */
export async function POST() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return cookieStore.getAll(); } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail || user.email !== superAdminEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sender = await checkSender();
  const sent = await sendEmail({
    to: user.email,
    subject: "Shamba Online test email",
    text: `This is a test email from Shamba Online, sent as ${EMAIL_FROM}.`,
    html: `<p>This is a test email from Shamba Online, sent as <strong>${EMAIL_FROM.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong>.</p>`,
  });

  return NextResponse.json({
    ok: !sent.error,
    from: EMAIL_FROM,
    to: user.email,
    sender: sender.reason,
    error: sent.error,
  });
}
