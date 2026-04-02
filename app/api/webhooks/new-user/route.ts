import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  // Verify the shared secret so only Supabase can trigger this
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();

  // Supabase Database Webhook payload: { type, table, record, old_record, schema }
  const user = payload?.record;
  const email = user?.email ?? "unknown";
  const createdAt = user?.created_at ?? new Date().toISOString();

  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.error("NOTIFY_EMAIL env var not set");
    return NextResponse.json({ error: "NOTIFY_EMAIL not configured" }, { status: 500 });
  }

  const { error } = await resend.emails.send({
    from: "Shamba Farm Manager <onboarding@resend.dev>",
    to: notifyEmail,
    subject: "New user signed up",
    html: `
      <p>A new user has signed up to Shamba Farm Manager.</p>
      <ul>
        <li><strong>Email:</strong> ${email}</li>
        <li><strong>Signed up at:</strong> ${new Date(createdAt).toUTCString()}</li>
      </ul>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
