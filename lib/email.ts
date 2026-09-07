import { Resend } from "resend";

/* Sender for every email the app sends itself. Set EMAIL_FROM to an address on
   a domain verified in Resend (for example "Shamba Online <hello@shamba.online>").
   The resend.dev fallback only delivers to the Resend account owner, which is
   fine for trying things out and useless for real farmers. */
const RAW_EMAIL_FROM = process.env.EMAIL_FROM?.trim() ?? "";

/* Reads a sender written as "Name <address>", "<address>" or a bare address,
   forgiving stray quotes and a missing closing bracket, and rebuilds it in
   the exact shape Resend accepts. Null when no address can be found. */
export function parseSender(raw: string): { name: string; address: string; from: string } | null {
  const match = raw.trim().match(/^"?([^"<>]*?)"?\s*<?\s*([^\s<>"@]+@[^\s<>"@]+\.[^\s<>"@]+)\s*>?\s*"?\s*$/);
  if (!match) return null;
  const name = match[1].trim();
  const address = match[2].trim().toLowerCase();
  return { name, address, from: name ? `${name} <${address}>` : address };
}

const parsedSender = parseSender(RAW_EMAIL_FROM);
export const EMAIL_FROM = parsedSender?.from || "Shamba Online <onboarding@resend.dev>";

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

/* The bare address inside EMAIL_FROM, and its domain. */
export function senderAddress(): { address: string; domain: string } {
  const address = parseSender(EMAIL_FROM)?.address ?? "";
  return { address, domain: address.split("@")[1] ?? "" };
}

export type SenderCheck = { ok: boolean; reason: string; verified: string[] };

let senderCache: { at: number; result: SenderCheck } | null = null;

/* Can Resend deliver from EMAIL_FROM to anyone? Asks Resend which domains
   are verified and compares. Cached for five minutes so a burst of reset
   requests does not hammer the Resend API. */
export async function checkSender(): Promise<SenderCheck> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { ok: false, reason: "RESEND_API_KEY is not set", verified: [] };
  if (senderCache && Date.now() - senderCache.at < 5 * 60_000) return senderCache.result;
  if (RAW_EMAIL_FROM && !parsedSender) {
    return { ok: false, reason: `EMAIL_FROM is not a usable sender: ${JSON.stringify(RAW_EMAIL_FROM)}. Write it as "Shamba Online <hello@shamba.online>".`, verified: [] };
  }

  const { address, domain } = senderAddress();
  let result: SenderCheck;
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${key}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (res.status === 401 || res.status === 403) {
      result = { ok: false, reason: "Resend rejected the API key (401/403)", verified: [] };
    } else if (res.status !== 200) {
      result = { ok: false, reason: `Resend answered ${res.status} when listing domains`, verified: [] };
    } else {
      const body = (await res.json()) as { data?: { name?: string; status?: string }[] };
      const verified = (body.data ?? []).filter((d) => d.status === "verified").map((d) => (d.name ?? "").toLowerCase());
      const list = verified.length ? `verified: ${verified.join(", ")}` : "no domain is verified in this Resend team";
      if (!domain || domain === "resend.dev") {
        result = { ok: false, reason: `Sender ${address || "onboarding@resend.dev"} only delivers to the Resend account owner; set EMAIL_FROM to an address on a verified domain (${list}). EMAIL_FROM is currently ${JSON.stringify(RAW_EMAIL_FROM)}.`, verified };
      } else if (!verified.includes(domain)) {
        result = { ok: false, reason: `EMAIL_FROM domain ${domain} is not verified in the Resend team this API key belongs to (${list}). EMAIL_FROM is ${JSON.stringify(RAW_EMAIL_FROM)}.`, verified };
      } else {
        result = { ok: true, reason: `Sending as ${EMAIL_FROM} from verified domain ${domain}`, verified };
      }
    }
  } catch (error) {
    result = { ok: false, reason: error instanceof Error ? error.message : String(error), verified: [] };
  }
  /* Only a positive answer is worth remembering; a failure should be
     re-checked as soon as the settings change. */
  if (result.ok) senderCache = { at: Date.now(), result };
  return result;
}

export async function sendEmail(input: { to: string; subject: string; html: string; text: string }): Promise<{ error: string | null }> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return { error: "RESEND_API_KEY is not set" };
  const resend = new Resend(key);
  const { error } = await resend.emails.send({ from: EMAIL_FROM, ...input });
  return { error: error ? `${error.name}: ${error.message}` : null };
}
