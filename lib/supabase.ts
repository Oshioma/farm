import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      // Force fresh data - prevent all caching
      "Cache-Control": "no-cache, no-store, must-revalidate, max-age=0",
      "Pragma": "no-cache",
      "Expires": "0",
    },
  },
});

// ---------------------------------------------------------------------------
// Shared current-user getter.
//
// supabase.auth.getUser() hits the network and contends for the auth token
// lock. When many components/queries call it at once (a dashboard load fires
// 10+), the lock gets "stolen" and calls reject with
// "Lock was stolen by another request". This getter reads the user from the
// locally-stored session instead (no network, no refresh race) and shares one
// in-flight read across concurrent callers, keeping it fresh via
// onAuthStateChange. Authorisation is still enforced server-side by RLS, which
// reads auth.uid() from the JWT — this only changes how the client learns who
// it is.
// ---------------------------------------------------------------------------
let cachedUser: User | null | undefined; // undefined = not yet loaded
let inflightUser: Promise<User | null> | null = null;

export async function getCurrentUser(): Promise<User | null> {
  if (cachedUser !== undefined) return cachedUser;
  if (inflightUser) return inflightUser;
  inflightUser = supabase.auth
    .getSession()
    .then(({ data }) => {
      cachedUser = data.session?.user ?? null;
      return cachedUser;
    })
    .catch(() => {
      cachedUser = null;
      return null;
    })
    .finally(() => {
      inflightUser = null;
    });
  return inflightUser;
}

// Keep the cache in sync with sign in/out and token refreshes.
supabase.auth.onAuthStateChange((_event, session) => {
  cachedUser = session?.user ?? null;
});
