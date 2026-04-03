import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const resend = new Resend(process.env.RESEND_API_KEY);

  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await req.json();
  const record = payload?.record;
  const userId = record?.user_id ?? "unknown";
  const farmId = record?.farm_id ?? "unknown";
  const createdAt = record?.created_at ?? new Date().toISOString();

  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.error("NOTIFY_EMAIL env var not set");
    return NextResponse.json({ error: "NOTIFY_EMAIL not configured" }, { status: 500 });
  }

  const { error } = await resend.emails.send({
    from: "Shamba Farm Manager <onboarding@resend.dev>",
    to: notifyEmail,
    subject: "New join request",
    html: `
      <p>Someone has requested to join a farm on Shamba Farm Manager.</p>
      <ul>
        <li><strong>User ID:</strong> ${userId}</li>
        <li><strong>Farm ID:</strong> ${farmId}</li>
        <li><strong>Requested at:</strong> ${new Date(createdAt).toUTCString()}</li>
      </ul>
      <p>Log in to your farm to accept or reject this request.</p>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
