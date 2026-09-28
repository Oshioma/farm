"use client";

import { useEffect, useState } from "react";
import { Copy, KeyRound, MessageCircle, RefreshCw, Share2 } from "lucide-react";

function canShare() {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

/* wa.me with a number opens either WhatsApp app, but on some phones with
   WhatsApp Business it does nothing. The share sheet lets the admin pick the
   app and the contact instead. */
async function shareSheet(text: string) {
  try {
    await navigator.share({ text });
  } catch {
    /* Closed without sending. */
  }
}

type Invite = {
  id: string;
  farmerName: string;
  phone: string;
  lang: "en" | "sw";
  step: "farm" | "location" | "crop" | "done";
  createdAt: string;
  openedAt: string | null;
  completedAt: string | null;
  source: "admin" | "self";
  hasPin: boolean;
  linkActive: boolean;
  signinUntil: string | null;
  farmName: string | null;
  shopLink: string | null;
  link: string;
  message: string;
  whatsapp: string;
  pinMessage: string;
  pinWhatsapp: string;
};

const stepLabel: Record<Invite["step"], string> = {
  farm: "Not started",
  location: "Named the farm",
  crop: "Added location",
  done: "Shop live",
};

/* The admin's WhatsApp invite tool. Creating an invite gives back the first
   message and a wa.me link; the admin taps Send. The list below shows how far
   each farmer got, with a stage-aware nudge ready for anyone who stalled. */
export function InviteFarmers() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ farmerName: "", phone: "", lang: "sw" as "en" | "sw" });
  const [creating, setCreating] = useState(false);
  const [latest, setLatest] = useState<Invite | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [renewing, setRenewing] = useState<string | null>(null);

  /* Parse a reply defensively: a crashed function returns no JSON at all, and
     the status and raw text are the only clue to what went wrong. */
  async function readJson(res: Response) {
    const text = await res.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch {
      throw new Error(`The server replied ${res.status} ${res.statusText || ""} with: ${text.slice(0, 200) || "(empty body)"}`);
    }
  }

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/invites");
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || `Could not load invites (${res.status})`);
      setInvites(data.invites ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load invites");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || `Could not create the invite (${res.status})`);
      setLatest(data.invite);
      setInvites((current) => [data.invite, ...current]);
      setForm({ farmerName: "", phone: "", lang: form.lang });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the invite");
    } finally {
      setCreating(false);
    }
  }

  /* Forgot PIN, or the link has expired: clear the PIN, give the link 14 more
     days, and put the "choose a new PIN" message in the ready-to-send box. */
  async function newPinLink(invite: Invite) {
    if (!window.confirm(`Remove ${invite.farmerName}'s PIN and send them a link to choose a new one?`)) return;
    setRenewing(invite.id);
    setError("");
    try {
      const res = await fetch("/api/admin/invites", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: invite.id, resetPin: true }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(data.error || `Could not renew the link (${res.status})`);
      const renewed: Invite = data.invite;
      setInvites((current) => current.map((row) => (row.id === renewed.id ? renewed : row)));
      setLatest({ ...renewed, message: renewed.pinMessage, whatsapp: renewed.pinWhatsapp });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not renew the link");
    } finally {
      setRenewing(null);
    }
  }

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy. Select the text and copy it by hand.");
    }
  }

  const waButton = "inline-flex items-center gap-1.5 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800";
  const ghostButton = "inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100";

  return (
    <div className="rounded-3xl border border-emerald-200 bg-emerald-50/40 p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Invite a farmer on WhatsApp</h2>
          <p className="mt-1 text-sm text-zinc-600">
            Enter their name and number, pick the language, then tap Send. The link opens a three-question setup
            that needs no login and ends with their shop live. Farmers can also sign themselves up at{" "}
            <a href="/jisajili" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline">/jisajili</a>{" "}
            and come back later at <a href="/ingia" target="_blank" rel="noreferrer" className="font-medium text-emerald-700 hover:underline">/ingia</a> with their number and PIN.
          </p>
        </div>
        <button type="button" onClick={load} className={ghostButton}><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      <form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
        <label className="text-sm font-medium text-zinc-700">Farmer&apos;s name
          <input required value={form.farmerName} onChange={(event) => setForm((f) => ({ ...f, farmerName: event.target.value }))} placeholder="e.g. Amina Juma" className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5" />
        </label>
        <label className="text-sm font-medium text-zinc-700">WhatsApp number
          <input required value={form.phone} onChange={(event) => setForm((f) => ({ ...f, phone: event.target.value }))} placeholder="0712 345 678" inputMode="tel" className="mt-1.5 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5" />
        </label>
        <div className="text-sm font-medium text-zinc-700">Language
          <div className="mt-1.5 inline-flex rounded-xl border border-zinc-300 bg-white p-1">
            {(["sw", "en"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setForm((f) => ({ ...f, lang: value }))} className={"rounded-lg px-3 py-1.5 text-sm font-semibold " + (form.lang === value ? "bg-emerald-700 text-white" : "text-zinc-600")}>
                {value === "sw" ? "Kiswahili" : "English"}
              </button>
            ))}
          </div>
        </div>
        <button type="submit" disabled={creating || !form.farmerName.trim() || !form.phone.trim()} className={waButton + " disabled:opacity-50"}>{creating ? "Creating…" : "Create invite"}</button>
      </form>

      {error && <p className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</p>}

      {latest && (
        <div className="mt-4 rounded-2xl border border-emerald-300 bg-white p-4">
          <p className="text-sm font-semibold text-emerald-900">Ready to send to {latest.farmerName}</p>
          <pre className="mt-2 whitespace-pre-wrap rounded-xl bg-zinc-50 p-3 text-sm text-zinc-800">{latest.message}</pre>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={latest.whatsapp} target="_blank" rel="noreferrer" className={waButton}><MessageCircle className="h-4 w-4" /> Send on WhatsApp</a>
            {canShare() && <button type="button" onClick={() => shareSheet(latest.message)} className={ghostButton}><Share2 className="h-4 w-4" /> Share via…</button>}
            <button type="button" onClick={() => copy(latest.message, "latest-msg")} className={ghostButton}><Copy className="h-4 w-4" /> {copied === "latest-msg" ? "Copied" : "Copy message"}</button>
            <button type="button" onClick={() => copy(latest.link, "latest-link")} className={ghostButton}><Copy className="h-4 w-4" /> {copied === "latest-link" ? "Copied" : "Copy link"}</button>
          </div>
        </div>
      )}

      <div className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-600">Invites</h3>
        {loading ? (
          <p className="mt-2 text-sm text-zinc-500">Loading…</p>
        ) : invites.length === 0 ? (
          <p className="mt-2 text-sm text-zinc-500">No invites yet.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-zinc-500">
                  <th className="py-2 pr-3">Farmer</th>
                  <th className="py-2 pr-3">Number</th>
                  <th className="py-2 pr-3">Lang</th>
                  <th className="py-2 pr-3">Progress</th>
                  <th className="py-2 pr-3">Farm</th>
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite.id} className="border-t border-zinc-100 align-top">
                    <td className="py-2 pr-3 font-medium">
                      {invite.farmerName}
                      {invite.source === "self" && <span className="ml-1.5 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-800" title="Signed up on their own at /jisajili">Self</span>}
                    </td>
                    <td className="py-2 pr-3 text-zinc-600">+{invite.phone}</td>
                    <td className="py-2 pr-3 text-zinc-600">{invite.lang === "sw" ? "SW" : "EN"}</td>
                    <td className="py-2 pr-3">
                      <span className={"rounded-full px-2 py-0.5 text-xs font-medium " + (invite.step === "done" ? "bg-emerald-100 text-emerald-800" : invite.openedAt ? "bg-amber-100 text-amber-800" : "bg-zinc-100 text-zinc-600")}>
                        {stepLabel[invite.step]}{!invite.openedAt && invite.step === "farm" ? " · not opened" : ""}
                      </span>
                      <span className="mt-1 block text-xs text-zinc-500">
                        {invite.hasPin ? "PIN set" : "No PIN"} · {invite.linkActive ? "link signs in" : "link expired"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-zinc-600">
                      {invite.shopLink ? <a href={invite.shopLink} target="_blank" rel="noreferrer" className="text-emerald-700 hover:underline">{invite.farmName}</a> : invite.farmName ?? "—"}
                    </td>
                    <td className="py-2">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <a href={invite.whatsapp} target="_blank" rel="noreferrer" className={waButton} title={invite.message}><MessageCircle className="h-4 w-4" /> {invite.step === "done" ? "Send shop link" : invite.openedAt ? "Nudge" : "Send"}</a>
                        {canShare() && <button type="button" onClick={() => shareSheet(invite.message)} className={ghostButton} title="Pick the app and contact yourself"><Share2 className="h-4 w-4" /></button>}
                        <button type="button" onClick={() => copy(invite.link, invite.id)} className={ghostButton}><Copy className="h-4 w-4" /> {copied === invite.id ? "Copied" : "Link"}</button>
                        {invite.openedAt && (
                          <button type="button" onClick={() => newPinLink(invite)} disabled={renewing === invite.id} className={ghostButton} title="Forgot PIN or link expired: clear the PIN and renew the link for 14 days">
                            <KeyRound className="h-4 w-4" /> {renewing === invite.id ? "Renewing…" : "New PIN link"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
