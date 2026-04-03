"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type InviteInfo = {
  id: string;
  created_by: string | null;
  farm_id: string;
};

function JoinInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const router = useRouter();

  const [status, setStatus] = useState<"loading" | "ready" | "joining" | "done" | "error">("loading");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [message, setMessage] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No invite token found in this link.");
      return;
    }

    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setLoggedIn(!!user);

      // Validate token
      const { data: inv, error } = await supabase
        .from("farm_invites")
        .select("id, farm_id, created_by")
        .eq("token", token)
        .is("used_by", null)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (error || !inv) {
        setStatus("error");
        setMessage("This invite link is invalid or has already been used.");
        return;
      }

      setInvite({ id: inv.id, farm_id: inv.farm_id, created_by: inv.created_by });
      setStatus("ready");
    })();
  }, [token]);

  async function acceptInvite() {
    if (!invite) return;
    setStatus("joining");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/login?redirectTo=/join?token=${token}`);
      return;
    }

    // Find all farms the inviter is a member of
    const { data: inviterFarms } = await supabase
      .from("farm_members")
      .select("farm_id")
      .eq("profile_id", invite.created_by);

    const farmIds = (inviterFarms ?? []).map((f: { farm_id: string }) => f.farm_id);
    if (farmIds.length === 0) farmIds.push(invite.farm_id); // fallback

    // Get existing memberships for this user
    const { data: existingRows } = await supabase
      .from("farm_members")
      .select("farm_id")
      .eq("profile_id", user.id);
    const alreadyIn = new Set((existingRows ?? []).map((r: { farm_id: string }) => r.farm_id));

    const toInsert = farmIds
      .filter((fid: string) => !alreadyIn.has(fid))
      .map((fid: string) => ({ farm_id: fid, profile_id: user.id, user_email: user.email, role_on_farm: "worker" }));

    if (toInsert.length > 0) {
      const { error: memberError } = await supabase.from("farm_members").insert(toInsert);
      if (memberError) {
        setStatus("error");
        setMessage("Failed to join the farm. Please try again.");
        return;
      }
    }

    // Mark invite as used
    await supabase.from("farm_invites").update({ used_by: user.id }).eq("id", invite.id);

    setStatus("done");
    setTimeout(() => router.push("/farm"), 2000);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Shamba Farm Manager
          </p>

          {status === "loading" && (
            <p className="mt-6 text-sm text-zinc-500">Checking invite…</p>
          )}

          {status === "ready" && invite && (
            <>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">You're invited</h1>
              <p className="mt-2 text-sm text-zinc-500">
                You've been invited to join Shamba Farm Manager.
              </p>
              {!loggedIn && (
                <p className="mt-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                  You'll need to log in first — you'll be brought back here after.
                </p>
              )}
              <button
                onClick={acceptInvite}
                className="mt-6 w-full rounded-2xl bg-zinc-900 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                {loggedIn ? "Accept invite" : "Log in to accept invite"}
              </button>
            </>
          )}

          {status === "joining" && (
            <p className="mt-6 text-sm text-zinc-500">Joining farm…</p>
          )}

          {status === "done" && (
            <>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">You're in!</h1>
              <p className="mt-2 text-sm text-zinc-500">Taking you to the farm…</p>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="mt-4 text-2xl font-semibold tracking-tight">Invalid link</h1>
              <p className="mt-2 text-sm text-zinc-500">{message}</p>
              <Link
                href="/farm"
                className="mt-6 inline-block rounded-2xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Go to farm
              </Link>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-stone-50">
        <p className="text-sm text-zinc-500">Loading…</p>
      </main>
    }>
      <JoinInner />
    </Suspense>
  );
}
