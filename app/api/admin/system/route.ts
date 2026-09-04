import { createServerClient } from "@supabase/ssr";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

/* System health report for the super admin: which environment variables are
   set, whether every outside connection actually answers, and which database
   migrations have landed. Values of secrets are never returned — only whether
   they are present, whether they are the right shape, and what they unlock. */

type Status = "ok" | "warn" | "fail" | "unknown";

type Check = {
  key: string;
  label: string;
  status: Status;
  detail: string;
  /** What stops working when this is broken. */
  impact?: string;
  ms?: number;
};

type EnvCheck = Check & { required: boolean; group: string };

type MigrationCheck = Check & { version: string };

const SECRET_PLACEHOLDER = "•".repeat(12);

/* ── Environment variables ─────────────────────────────────── */

type EnvSpec = {
  key: string;
  group: string;
  required: boolean;
  secret: boolean;
  purpose: string;
  impact: string;
  /** Returns a problem description, or null when the value looks right. */
  validate?: (value: string) => string | null;
};

const ENV_SPECS: EnvSpec[] = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    group: "Supabase",
    required: true,
    secret: false,
    purpose: "The Supabase project every page reads and writes.",
    impact: "Nothing loads — no page can reach the database.",
    validate: (v) => (/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(v) ? null : "Does not look like a Supabase project URL"),
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    group: "Supabase",
    required: true,
    secret: true,
    purpose: "Public key the browser uses; all access is bounded by RLS.",
    impact: "Nothing loads — sign-in and every query fail.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    group: "Supabase",
    required: true,
    secret: true,
    purpose: "Server-only key that bypasses RLS for admin endpoints.",
    impact: "Admin pages, member lists, invites and the Relate bridge fail.",
  },
  {
    key: "SUPER_ADMIN_EMAIL",
    group: "Access",
    required: true,
    secret: false,
    purpose: "Server-side gate on every /api/admin endpoint.",
    impact: "All admin endpoints refuse everyone, including you.",
    validate: (v) => (v.includes("@") ? null : "Not an email address"),
  },
  {
    key: "NEXT_PUBLIC_SUPER_ADMIN_EMAIL",
    group: "Access",
    required: true,
    secret: false,
    purpose: "Shows the Admin link in the farm header for this address.",
    impact: "The Admin link stays hidden — the pages still work if you type the URL.",
    validate: (v) => (v.includes("@") ? null : "Not an email address"),
  },
  {
    key: "RESEND_API_KEY",
    group: "Email",
    required: false,
    secret: true,
    purpose: "Sends the new-signup and join-request notification emails.",
    impact: "Signup and join-request emails are never sent.",
    validate: (v) => (v.startsWith("re_") ? null : "Resend keys normally start with re_"),
  },
  {
    key: "NOTIFY_EMAIL",
    group: "Email",
    required: false,
    secret: false,
    purpose: "Where those notification emails are delivered.",
    impact: "Both webhooks return 500 and no email is sent.",
    validate: (v) => (v.includes("@") ? null : "Not an email address"),
  },
  {
    key: "WEBHOOK_SECRET",
    group: "Email",
    required: false,
    secret: true,
    purpose: "Shared secret Supabase database webhooks present when calling in.",
    impact: "Webhook calls are rejected as unauthorized, so no emails go out.",
    validate: (v) => (v.length >= 16 ? null : "Shorter than 16 characters — use a long random string"),
  },
  {
    key: "RELATE_BRIDGE_SECRET",
    group: "Integrations",
    required: false,
    secret: true,
    purpose: "Lets relate.click read a member's own crops via /api/external/my-crops.",
    impact: "The Relate crop bridge stays off (it fails closed).",
    validate: (v) => (v.length >= 24 ? null : "Shorter than 24 characters — use a long random string"),
  },
];

/** Decode a Supabase JWT-style key payload without verifying it (no secret needed). */
function decodeKeyClaims(key: string): { role?: string; ref?: string } | null {
  const parts = key.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const claims = JSON.parse(json) as { role?: string; ref?: string };
    return claims;
  } catch {
    return null;
  }
}

function projectRef(url: string): string | null {
  const m = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\./i);
  return m ? m[1] : null;
}

function checkEnv(): { checks: EnvCheck[]; crossChecks: Check[] } {
  const checks: EnvCheck[] = ENV_SPECS.map((spec) => {
    const raw = process.env[spec.key];
    const value = raw?.trim() ?? "";

    if (!value) {
      return {
        key: spec.key,
        label: spec.purpose,
        group: spec.group,
        required: spec.required,
        status: spec.required ? "fail" : "warn",
        detail: spec.required ? "Not set" : "Not set — optional",
        impact: spec.impact,
      };
    }

    const problem = spec.validate?.(value) ?? null;
    const shown = spec.secret ? `${SECRET_PLACEHOLDER} (${value.length} chars)` : value;
    return {
      key: spec.key,
      label: spec.purpose,
      group: spec.group,
      required: spec.required,
      status: problem ? "warn" : "ok",
      detail: problem ? `${shown} — ${problem}` : shown,
      impact: spec.impact,
    };
  });

  /* Mistakes that only show up when two variables are compared. */
  const crossChecks: Check[] = [];
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  const adminEmail = process.env.SUPER_ADMIN_EMAIL?.trim() ?? "";
  const publicAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL?.trim() ?? "";

  if (adminEmail && publicAdminEmail) {
    const same = adminEmail.toLowerCase() === publicAdminEmail.toLowerCase();
    crossChecks.push({
      key: "admin_email_match",
      label: "Super admin addresses agree",
      status: same ? "ok" : "warn",
      detail: same
        ? "SUPER_ADMIN_EMAIL and NEXT_PUBLIC_SUPER_ADMIN_EMAIL match"
        : "The two super admin addresses differ",
      impact: same ? undefined : "The Admin link shows for one address while the API only accepts the other.",
    });
  }

  if (anon && service) {
    const identical = anon === service;
    crossChecks.push({
      key: "keys_distinct",
      label: "Anon and service keys are different",
      status: identical ? "fail" : "ok",
      detail: identical ? "Both keys hold the same value" : "The two keys differ, as they should",
      impact: identical
        ? "Either the browser is running with a key that bypasses RLS, or admin endpoints have no privileges."
        : undefined,
    });
  }

  const anonClaims = anon ? decodeKeyClaims(anon) : null;
  const serviceClaims = service ? decodeKeyClaims(service) : null;
  const ref = url ? projectRef(url) : null;

  if (anonClaims?.role) {
    crossChecks.push({
      key: "anon_role",
      label: "Anon key carries the anon role",
      status: anonClaims.role === "anon" ? "ok" : "fail",
      detail: `Key role is "${anonClaims.role}"`,
      impact: anonClaims.role === "anon" ? undefined : "A non-anon key in the browser bundle would expose data past RLS.",
    });
  }

  if (serviceClaims?.role) {
    crossChecks.push({
      key: "service_role",
      label: "Service key carries the service_role role",
      status: serviceClaims.role === "service_role" ? "ok" : "fail",
      detail: `Key role is "${serviceClaims.role}"`,
      impact: serviceClaims.role === "service_role" ? undefined : "Admin endpoints will hit RLS errors instead of seeing every row.",
    });
  }

  for (const [name, claims] of [["Anon", anonClaims], ["Service", serviceClaims]] as const) {
    if (ref && claims?.ref) {
      const same = claims.ref === ref;
      crossChecks.push({
        key: `${name.toLowerCase()}_key_project`,
        label: `${name} key belongs to this project`,
        status: same ? "ok" : "fail",
        detail: same ? `Both point at ${ref}` : `Key is for project ${claims.ref}, URL is ${ref}`,
        impact: same ? undefined : "The key is from a different Supabase project, so every request is rejected.",
      });
    }
  }

  return { checks, crossChecks };
}

/* ── Live connections ──────────────────────────────────────── */

async function timed<T>(fn: () => Promise<T>): Promise<{ result?: T; error?: unknown; ms: number }> {
  const started = Date.now();
  try {
    return { result: await fn(), ms: Date.now() - started };
  } catch (error) {
    return { error, ms: Date.now() - started };
  }
}

function message(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

async function checkConnections(admin: SupabaseClient | null): Promise<Check[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const resendKey = process.env.RESEND_API_KEY?.trim() ?? "";

  const checks: Check[] = [];

  /* The browser's path into the database: anon key against PostgREST. */
  if (url && anon) {
    const { result, error, ms } = await timed(async () => {
      const res = await fetch(`${url}/rest/v1/farms?select=id&limit=1`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      return res.status;
    });
    checks.push({
      key: "rest_anon",
      label: "Database — browser (anon key)",
      status: error ? "fail" : result === 200 ? "ok" : "warn",
      detail: error ? message(error) : `PostgREST answered ${result}`,
      impact: "Every page in the app reads through this.",
      ms,
    });
  } else {
    checks.push({
      key: "rest_anon",
      label: "Database — browser (anon key)",
      status: "fail",
      detail: "Skipped — URL or anon key missing",
      impact: "Every page in the app reads through this.",
    });
  }

  if (admin) {
    const dbCheck = await timed(async () => {
      const { error } = await admin.from("farms").select("id", { head: true }).limit(1);
      if (error) throw new Error(error.message);
      return true;
    });
    checks.push({
      key: "rest_service",
      label: "Database — server (service role key)",
      status: dbCheck.error ? "fail" : "ok",
      detail: dbCheck.error ? message(dbCheck.error) : "Query succeeded past RLS",
      impact: "Admin pages, member lists and invites depend on this.",
      ms: dbCheck.ms,
    });

    const authCheck = await timed(async () => {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (error) throw new Error(error.message);
      return data.users.length;
    });
    checks.push({
      key: "auth_admin",
      label: "Auth admin API",
      status: authCheck.error ? "fail" : "ok",
      detail: authCheck.error ? message(authCheck.error) : "Auth user list reachable",
      impact: "Deleting users and resolving member emails need this.",
      ms: authCheck.ms,
    });

    const storageCheck = await timed(async () => {
      const { data, error } = await admin.storage.listBuckets();
      if (error) throw new Error(error.message);
      return data.map((b) => b.name);
    });
    const buckets = storageCheck.result ?? [];
    const hasPlantImages = buckets.includes("plant-images");
    checks.push({
      key: "storage",
      label: "Storage bucket — plant-images",
      status: storageCheck.error ? "fail" : hasPlantImages ? "ok" : "fail",
      detail: storageCheck.error
        ? message(storageCheck.error)
        : hasPlantImages
          ? `Present (${buckets.length} bucket${buckets.length === 1 ? "" : "s"} total)`
          : `Missing — buckets found: ${buckets.join(", ") || "none"}`,
      impact: "Crop and plant photo uploads fail without it.",
      ms: storageCheck.ms,
    });
  } else {
    for (const [key, label] of [
      ["rest_service", "Database — server (service role key)"],
      ["auth_admin", "Auth admin API"],
      ["storage", "Storage bucket — plant-images"],
    ] as const) {
      checks.push({ key, label, status: "fail", detail: "Skipped — service role key missing" });
    }
  }

  /* Resend: ask the API whether the key is live rather than guessing. */
  if (resendKey) {
    const { result, error, ms } = await timed(async () => {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${resendKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      return res.status;
    });
    checks.push({
      key: "resend",
      label: "Resend email API",
      status: error ? "fail" : result === 200 ? "ok" : result === 401 || result === 403 ? "fail" : "warn",
      detail: error
        ? message(error)
        : result === 200
          ? "Key accepted"
          : result === 401 || result === 403
            ? "Key rejected (401/403) — regenerate it in Resend"
            : `Resend answered ${result}`,
      impact: "New-signup and join-request emails go through this.",
      ms,
    });
  } else {
    checks.push({
      key: "resend",
      label: "Resend email API",
      status: "warn",
      detail: "Not configured — RESEND_API_KEY is unset",
      impact: "New-signup and join-request emails go through this.",
    });
  }

  /* Inbound integrations can't be dialled from here; report how they're configured. */
  const webhookSecret = process.env.WEBHOOK_SECRET?.trim() ?? "";
  checks.push({
    key: "supabase_webhooks",
    label: "Supabase database webhooks",
    status: webhookSecret ? "unknown" : "warn",
    detail: webhookSecret
      ? "Secret configured. Supabase calls in, so confirm the hooks in Database → Webhooks send Authorization: Bearer <WEBHOOK_SECRET>"
      : "WEBHOOK_SECRET unset — incoming webhook calls are rejected",
    impact: "Drives the new-user and join-request emails.",
  });

  const relateSecret = process.env.RELATE_BRIDGE_SECRET?.trim() ?? "";
  checks.push({
    key: "relate_bridge",
    label: "Relate crop bridge (inbound)",
    status: relateSecret ? "unknown" : "warn",
    detail: relateSecret
      ? "Secret configured. Relate must send the same value as FARM_API_SECRET"
      : "RELATE_BRIDGE_SECRET unset — the bridge is off and returns 401",
    impact: "Lets relate.click show a member their own crops.",
  });

  return checks;
}

/* ── Database schema / migrations ──────────────────────────── */

/* Every table the app queries. */
const TABLES = [
  "activities", "assets", "companion_planting", "compost", "crops", "expenses",
  "farm_invites", "farm_map_layouts", "farm_members", "farms", "fertilisations",
  "harvest_eta", "harvests", "income_prediction", "join_requests", "lunar_days",
  "lunar_tasks", "mulch", "notifications", "pest_logs", "plants", "planting_plan",
  "sales", "seed_collection", "seedling_map_layouts", "seedlings",
  "soil_improvements", "soil_tests", "system_docs", "tasks", "tree_registry",
  "wants", "work_hours", "zones",
];

/* Each migration in supabase/migrations, with the schema it should have created.
   Probing for those tables and columns is how we tell whether it has run. */
const MIGRATIONS: { version: string; name: string; probes: string[]; note?: string }[] = [
  { version: "20260417211645", name: "check_farm_map_layouts", probes: [], note: "Diagnostic SELECTs only — nothing to verify." },
  { version: "20260417211646", name: "create_farm_map_layouts_table", probes: ["farm_map_layouts"] },
  { version: "20260417211647", name: "create_seedling_map_layouts_table", probes: ["seedling_map_layouts"] },
  { version: "20260417211648", name: "add_extra_zone_ids_to_plants", probes: ["plants.extra_zone_ids"] },
  { version: "20260417211649", name: "add_image_url_to_crops", probes: ["crops.image_url"] },
  { version: "20260417211650", name: "add_map_position_to_zones", probes: ["zones.map_position"] },
  { version: "20260417215921", name: "add_bed_sync_columns_to_zones", probes: ["zones.bed_uid", "zones.source"] },
  { version: "20260418141641", name: "create_mulch_table", probes: ["mulch"] },
  { version: "20260419161845", name: "create_wants_table", probes: ["wants"] },
  { version: "20260609113528", name: "create_lunar_planner_tables", probes: ["lunar_days", "lunar_tasks"] },
  { version: "20260609124855", name: "update_lunar_planner_auto_phase_and_reminders", probes: ["lunar_days.calculated_moon_phase", "lunar_tasks.reminder_date"] },
  { version: "20260708064140", name: "add_goal_timeframe_to_tasks", probes: ["tasks.goal_timeframe"] },
  { version: "20260708080732", name: "add_farm_sharing_to_lunar_tasks", probes: ["lunar_tasks.farm_id", "lunar_tasks.assigned_to"] },
  { version: "20260708090649", name: "add_extra_zone_ids_to_fertiliser_compost_mulch", probes: ["fertilisations.extra_zone_ids", "compost.extra_zone_ids", "mulch.extra_zone_ids"] },
  { version: "20260708100326", name: "add_next_fertilise_date_to_fertilisations", probes: ["fertilisations.next_fertilise_date", "fertilisations.next_fertilise_task_id"] },
  { version: "20260719145929", name: "add_transplanted_to_seedlings", probes: ["seedlings.transplanted", "seedlings.transplanted_at"] },
  { version: "20260720164406", name: "add_carried_over_from_to_lunar_tasks", probes: ["lunar_tasks.carried_over_from"] },
  { version: "20260720165301", name: "add_farm_sharing_to_tasks", probes: [], note: "RLS policies only — not visible from here." },
  { version: "20260720215124", name: "add_manager_role_enforcement", probes: [], note: "RLS policies only — not visible from here." },
  { version: "20260728143226", name: "add_join_requests_rls", probes: ["join_requests"], note: "Table check only; the policy change itself is not visible from here." },
  { version: "20260728145203", name: "create_notifications", probes: ["notifications"] },
  { version: "20260821153055", name: "add_crop_id_to_harvest_eta", probes: ["harvest_eta.crop_id"] },
  { version: "20260821170000", name: "create_customers_and_orders", probes: ["customers", "customer_orders"] },
  { version: "20260821190000", name: "add_default_share_to_customers", probes: ["customers.default_share_pct"] },
  { version: "20260821203000", name: "add_list_in_market_to_farms", probes: ["farms.list_in_market"] },
  { version: "20260822080000", name: "add_shop_hero_to_farms", probes: ["farms.shop_hero_url"] },
  { version: "20260822090000", name: "notification_deep_links", probes: [], note: "Trigger functions only — not visible from here." },
  { version: "20260822100000", name: "add_detail_fields_to_crops", probes: ["crops.flavour", "crops.best_eaten", "crops.why_special"] },
  { version: "20260822110000", name: "add_produce_image_to_crops", probes: ["crops.produce_image_url"] },
  {
    version: "20260903100000",
    name: "create_atomic_public_reservations",
    probes: ["customer_orders.reservation_id", "customer_orders.reservation_reference"],
  },
  {
    version: "20260903113000",
    name: "add_order_fulfilment_flow",
    probes: ["customer_orders.actual_quantity_kg", "customer_orders.actual_price_per_kg", "customer_orders.collected_at"],
  },
  {
    version: "20260904100000",
    name: "add_order_tracking_and_notifications",
    probes: ["customer_orders.tracking_token"],
  },
];

type ProbeResult = { status: Status; detail: string };

/** Ask PostgREST for the column (or table); its error code says what is missing. */
async function probe(admin: SupabaseClient, target: string): Promise<ProbeResult> {
  const [table, column] = target.split(".");
  const { error } = await admin.from(table).select(column ?? "*", { head: true }).limit(1);
  if (!error) return { status: "ok", detail: "Present" };
  const code = (error as { code?: string }).code ?? "";
  if (code === "42P01" || (!column && /does not exist/i.test(error.message))) {
    return { status: "fail", detail: `Table "${table}" does not exist` };
  }
  if (code === "42703") return { status: "fail", detail: `Column "${target}" does not exist` };
  if (code === "PGRST205" || code === "PGRST204") {
    return { status: "fail", detail: `Not found in the API schema: ${error.message}` };
  }
  return { status: "unknown", detail: error.message };
}

async function checkSchema(admin: SupabaseClient | null): Promise<{ tables: Check[]; migrations: MigrationCheck[] }> {
  if (!admin) {
    return {
      tables: TABLES.map((t) => ({ key: t, label: t, status: "unknown" as Status, detail: "Skipped — service role key missing" })),
      migrations: MIGRATIONS.map((m) => ({
        key: m.name,
        version: m.version,
        label: m.name,
        status: "unknown" as Status,
        detail: "Skipped — service role key missing",
      })),
    };
  }

  const tables = await Promise.all(
    TABLES.map(async (table) => {
      const result = await probe(admin, table);
      return { key: table, label: table, status: result.status, detail: result.detail };
    })
  );

  const migrations = await Promise.all(
    MIGRATIONS.map(async (m) => {
      if (m.probes.length === 0) {
        return {
          key: m.name,
          version: m.version,
          label: m.name,
          status: "unknown" as Status,
          detail: m.note ?? "Nothing to verify",
        };
      }
      const results = await Promise.all(m.probes.map((p) => probe(admin, p)));
      const failed = results.filter((r) => r.status === "fail");
      const unknown = results.filter((r) => r.status === "unknown");
      const status: Status = failed.length > 0 ? "fail" : unknown.length > 0 ? "unknown" : "ok";
      const detail =
        failed.length > 0
          ? `Not applied — ${failed.map((f) => f.detail).join("; ")}`
          : unknown.length > 0
            ? unknown.map((u) => u.detail).join("; ")
            : `Applied — ${m.probes.join(", ")}`;
      return { key: m.name, version: m.version, label: m.name, status, detail: m.note ? `${detail} (${m.note})` : detail };
    })
  );

  return { tables, migrations };
}

/* ── Route ─────────────────────────────────────────────────── */

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
    if (!superAdminEmail || user.email !== superAdminEmail) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let admin: SupabaseClient | null = null;
    let adminError = "";
    try {
      admin = getSupabaseAdmin();
    } catch (err) {
      adminError = message(err);
    }

    const { checks: env, crossChecks } = checkEnv();
    const [connections, schema] = await Promise.all([checkConnections(admin), checkSchema(admin)]);

    const all: Check[] = [...env, ...crossChecks, ...connections, ...schema.tables, ...schema.migrations];
    const summary = {
      ok: all.filter((c) => c.status === "ok").length,
      warn: all.filter((c) => c.status === "warn").length,
      fail: all.filter((c) => c.status === "fail").length,
      unknown: all.filter((c) => c.status === "unknown").length,
    };

    return NextResponse.json({
      checkedAt: new Date().toISOString(),
      runtime: {
        nodeEnv: process.env.NODE_ENV ?? "unknown",
        vercelEnv: process.env.VERCEL_ENV ?? null,
        region: process.env.VERCEL_REGION ?? null,
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
        project: projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "") ?? null,
      },
      adminError: adminError || null,
      env,
      crossChecks,
      connections,
      tables: schema.tables,
      migrations: schema.migrations,
      summary,
    });
  } catch (err) {
    return NextResponse.json({ error: message(err) }, { status: 500 });
  }
}
