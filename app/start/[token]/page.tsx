import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { inviteState, loadInviteByToken } from "@/lib/invites";
import { StartWizard } from "./StartWizard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Shamba Online — farm setup" };

type Props = { params: Promise<{ token: string }> };

/* Public: a WhatsApp invite opens this. The token in the URL is the only
   credential, so the page never needs a session. Invalid tokens get a plain
   message rather than a redirect to login. */
export default async function StartPage({ params }: Props) {
  const { token } = await params;
  const admin = getSupabaseAdmin();
  const invite = await loadInviteByToken(admin, token);

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-stone-50 px-4">
        <div className="max-w-sm rounded-3xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Shamba Online</p>
          <h1 className="mt-2 text-xl font-semibold">This link is not valid</h1>
          <p className="mt-2 text-sm text-zinc-600">Kiungo hiki si sahihi. Ask for a new link. / Omba kiungo kipya.</p>
        </div>
      </main>
    );
  }

  if (!invite.opened_at) {
    await admin.from("whatsapp_invites").update({ opened_at: new Date().toISOString() }).eq("id", invite.id);
  }
  const state = await inviteState(admin, invite);
  return <StartWizard initial={state} />;
}
