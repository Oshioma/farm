"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type InviteInfo = {
  id: string;
  farm_id: string;
  farm_name: string;
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
        .select("id, farm_id, farms(name)")
        .eq("token", token)
        .is("used_by", null)
        .gte("expires_at", new Date().toISOString())
        .single();

      if (error || !inv) {
        setStatus("error");
        setMessage("This invite link is invalid or has already been used.");
        return;
      }

      const farmsData = inv.farms as unknown as { name: string } | null;
      const farmName = farmsData?.name ?? "a farm";
      setInvite({ id: inv.id, farm_id: inv.farm_id, farm_name: farmName });
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

    // Check if already a member
    const { data: existing } = await supabase
      .from("farm_members")
      .select("id")
      .eq("farm_id", invite.farm_id)
      .eq("profile_id", user.id)
      .single();

    if (!existing) {
      const { error: memberError } = await supabase.from("farm_members").insert({
        farm_id: invite.farm_id,
        profile_id: user.id,
        role_on_farm: "member",
      });
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
                Join <span className="font-semibold text-zinc-900">{invite.farm_name}</span> on Shamba Farm Manager.
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
                {loggedIn ? `Join ${invite.farm_name}` : "Log in to accept invite"}
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
