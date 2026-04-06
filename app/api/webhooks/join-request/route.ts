import { Resend } from "resend";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
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
  const userEmail = record?.user_email ?? null;
  const farmId = record?.farm_id ?? "unknown";
  const createdAt = record?.created_at ?? new Date().toISOString();

  const notifyEmail = process.env.NOTIFY_EMAIL;
  if (!notifyEmail) {
    console.error("NOTIFY_EMAIL env var not set");
    return NextResponse.json({ error: "NOTIFY_EMAIL not configured" }, { status: 500 });
  }

  // Look up user email and farm name
  const admin = getSupabaseAdmin();

  let resolvedEmail = userEmail;
  if (!resolvedEmail) {
    try {
      const { data } = await admin.auth.admin.getUserById(userId);
      resolvedEmail = data?.user?.email ?? userId;
    } catch {
      resolvedEmail = userId;
    }
  }

  let farmName = farmId;
  try {
    const { data } = await admin
      .from("farms")
      .select("name")
      .eq("id", farmId)
      .single();
    if (data?.name) farmName = data.name;
  } catch {
    // keep farmId as fallback
  }

  const { error } = await resend.emails.send({
    from: "Shamba Online <onboarding@resend.dev>",
    to: notifyEmail,
    subject: `Join request from ${resolvedEmail}`,
    html: `
      <p>Someone has requested to join a farm on Shamba Online.</p>
      <ul>
        <li><strong>Email:</strong> ${resolvedEmail}</li>
        <li><strong>Farm:</strong> ${farmName}</li>
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
