import { createBrowserClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// In-memory auth lock.
//
// By default supabase-auth serialises token access with the browser Web Locks
// API (navigator.locks). Every data query (.from().select()) acquires that
// lock to read the access token, so a dashboard load that fires ~16 queries in
// parallel makes them all contend for a single lock. On iOS Safari the Web
// Locks implementation resolves that contention by *stealing* the lock, which
// aborts the losing request with the native error
// "AbortError: Lock was stolen by another request" — surfacing here as e.g.
// "getAssets failed: ...". Any of the parallel queries can be the victim.
//
// This replacement serialises token access with a per-name in-memory promise
// chain instead (the same strategy as auth-js's own `processLock`). It never
// touches navigator.locks, so the lock can never be stolen. The only thing we
// give up is cross-tab lock coordination, which this single-tab app does not
// need; token refresh is still serialised correctly within the tab.
// ---------------------------------------------------------------------------
const lockChains = new Map<string, Promise<unknown>>();

function inMemoryLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const previous = lockChains.get(name) ?? Promise.resolve();
  // Run fn once the previous holder settles (success or failure).
  const result = previous.then(fn, fn);
  // Keep a never-rejecting tail so the chain survives a thrown fn.
  lockChains.set(
    name,
    result.then(
      () => {},
      () => {}
    )
  );
  return result;
}

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    lock: inMemoryLock,
  },
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
