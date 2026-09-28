import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { InviteRow } from "@/lib/invites";

/* Accounts for farmers who have a phone number and no email. Server-only: the
   service role reads and writes whatsapp_invites and farmer_pins, and the PIN
   is hashed here before it goes anywhere near the database. */

type Admin = SupabaseClient;

/** The email that stands in for a farmer who signed up by phone. */
export function phoneEmail(phone: string) {
  return `wa-${phone}@farmers.shamba.online`;
}

/** True when the auth account still exists (a test user may have been deleted). */
export async function userExists(admin: Admin, userId: string): Promise<boolean> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  return !error && !!data?.user;
}

/** Supabase has no lookup by email for admins, so page through the list. */
export async function findUserIdByEmail(admin: Admin, email: string): Promise<string | null> {
  const wanted = email.toLowerCase();
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error || !data?.users?.length) return null;
    const hit = data.users.find((user) => user.email?.toLowerCase() === wanted);
    if (hit) return hit.id;
    if (data.users.length < 200) return null;
  }
  return null;
}

/** The account already behind a phone number, if any: a PIN row, an earlier invite, or the stand-in email. */
export async function existingUserForPhone(admin: Admin, phone: string, excludeInviteId?: string): Promise<string | null> {
  const { data: pin } = await admin.from("farmer_pins").select("user_id").eq("phone", phone).maybeSingle();
  if (pin?.user_id && (await userExists(admin, pin.user_id))) return pin.user_id;

  let query = admin
    .from("whatsapp_invites")
    .select("user_id")
    .eq("phone", phone)
    .not("user_id", "is", null);
  if (excludeInviteId) query = query.neq("id", excludeInviteId);
  const { data: earlier } = await query.limit(1).maybeSingle();
  if (earlier?.user_id && (await userExists(admin, earlier.user_id))) return earlier.user_id;

  return findUserIdByEmail(admin, phoneEmail(phone));
}

/** Find or create the Supabase user behind an invite, remembering it on the row. */
export async function ensureUser(admin: Admin, invite: InviteRow): Promise<string> {
  const email = phoneEmail(invite.phone);

  // An id remembered from an earlier attempt is only good if the account still exists.
  let userId: string | null = invite.user_id && (await userExists(admin, invite.user_id)) ? invite.user_id : null;

  // Another invite or a PIN for the same phone may already have made the account.
  if (!userId) userId = await existingUserForPhone(admin, invite.phone, invite.id);

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      password: crypto.randomUUID() + crypto.randomUUID(),
      user_metadata: {
        full_name: invite.farmer_name,
        phone: invite.phone,
        signed_up_via: invite.source === "self" ? "whatsapp_self_signup" : "whatsapp_invite",
        lang: invite.lang,
      },
    });
    if (error && !/already/i.test(error.message)) throw error;
    userId = data?.user?.id ?? (await findUserIdByEmail(admin, email));
  }
  if (!userId) throw new Error("Could not create the farmer's account.");

  await ensureProfile(admin, userId, email, invite.farmer_name);
  if (invite.user_id !== userId) {
    await admin.from("whatsapp_invites").update({ user_id: userId }).eq("id", invite.id);
    invite.user_id = userId;
  }
  return userId;
}

/* farms.created_by and farm_members.profile_id point at public.profiles, a
   table the app never writes itself: a database trigger fills it for web
   signups, but an account made here through the admin API arrived without
   one. The table is not in this repo's migrations, so its exact columns are
   unknown: try the usual shape first, then fall back to the id alone. */
async function ensureProfile(admin: Admin, userId: string, email: string, fullName: string) {
  const { data: existing } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  if (existing) return;
  const attempts: Record<string, unknown>[] = [
    { id: userId, email, full_name: fullName },
    { id: userId, email },
    { id: userId },
  ];
  let lastError: unknown = null;
  for (const row of attempts) {
    const { error } = await admin.from("profiles").upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (!error) return;
    lastError = error;
    // A missing column means this shape is wrong; anything else is final.
    if (!/column|schema cache/i.test(error.message)) break;
  }
  throw lastError ?? new Error("Could not create the farmer's profile.");
}

/** A one-tap sign-in URL for an account, landing on `next` (a path on this site). */
export async function signInUrl(admin: Admin, userId: string, origin: string, next: string): Promise<string> {
  const { data: userData } = await admin.auth.admin.getUserById(userId);
  const email = userData?.user?.email;
  if (!email) throw new Error("This account has no sign-in address.");
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw error;
  const hashed = data.properties?.hashed_token;
  if (!hashed) throw new Error("Could not create a sign-in link.");
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("token_hash", hashed);
  url.searchParams.set("type", "magiclink");
  url.searchParams.set("next", next.startsWith("/") && !next.startsWith("//") ? next : "/farm");
  return url.toString();
}

/* ---------- PINs ---------- */

/** Four digits, like a mobile-money PIN. */
export function isPin(pin: unknown): pin is string {
  return typeof pin === "string" && /^\d{4}$/.test(pin);
}

function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

function pinMatches(pin: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(pin, Buffer.from(saltHex, "hex"), expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function hasPin(admin: Admin, phone: string): Promise<boolean> {
  const { data } = await admin.from("farmer_pins").select("phone").eq("phone", phone).maybeSingle();
  return !!data;
}

/** Set or replace the PIN for a phone, clearing any lockout. */
export async function setPin(admin: Admin, phone: string, userId: string, pin: string) {
  const { error } = await admin.from("farmer_pins").upsert(
    { phone, user_id: userId, pin_hash: hashPin(pin), failed_attempts: 0, locked_until: null, updated_at: new Date().toISOString() },
    { onConflict: "phone" }
  );
  if (error) throw error;
}

export async function clearPin(admin: Admin, phone: string) {
  const { error } = await admin.from("farmer_pins").delete().eq("phone", phone);
  if (error) throw error;
}

export type PinCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: "no_pin" | "wrong" | "locked"; minutes?: number };

/* Five wrong tries lock the number for 15 minutes; each further five doubles
   the wait, up to a day. Four digits are only safe with a lockout. */
const TRIES = 5;
function lockMinutes(failures: number) {
  const rounds = Math.floor(failures / TRIES);
  return rounds < 1 ? 0 : Math.min(15 * 2 ** (rounds - 1), 24 * 60);
}

export async function checkPin(admin: Admin, phone: string, pin: string): Promise<PinCheck> {
  const { data: row } = await admin
    .from("farmer_pins")
    .select("user_id, pin_hash, failed_attempts, locked_until")
    .eq("phone", phone)
    .maybeSingle();
  if (!row) return { ok: false, reason: "no_pin" };

  const now = Date.now();
  if (row.locked_until && new Date(row.locked_until).getTime() > now) {
    return { ok: false, reason: "locked", minutes: Math.ceil((new Date(row.locked_until).getTime() - now) / 60000) };
  }

  if (pinMatches(pin, row.pin_hash)) {
    if (row.failed_attempts || row.locked_until) {
      await admin.from("farmer_pins").update({ failed_attempts: 0, locked_until: null }).eq("phone", phone);
    }
    return { ok: true, userId: row.user_id };
  }

  const failures = (row.failed_attempts ?? 0) + 1;
  const minutes = failures % TRIES === 0 ? lockMinutes(failures) : 0;
  await admin
    .from("farmer_pins")
    .update({ failed_attempts: failures, locked_until: minutes ? new Date(now + minutes * 60000).toISOString() : null })
    .eq("phone", phone);
  return minutes ? { ok: false, reason: "locked", minutes } : { ok: false, reason: "wrong" };
}
