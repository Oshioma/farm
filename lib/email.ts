import { Resend } from "resend";

/* Sender for every email the app sends itself. Set EMAIL_FROM to an address on
   a domain verified in Resend (for example "Shamba Online <hello@shamba.online>").
   The resend.dev fallback only delivers to the Resend account owner, which is
   fine for trying things out and useless for real farmers. */
export const EMAIL_FROM = process.env.EMAIL_FROM?.trim() || "Shamba Online <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<{ error: string | null }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { error: "RESEND_API_KEY is not set" };
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: EMAIL_FROM, ...input });
  return { error: error ? error.message : null };
}
