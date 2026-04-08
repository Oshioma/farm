import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  global: {
    headers: {
      // Force fresh data and prevent caching
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
    fetch: (url, options = {}) => {
      // Add timestamp to force fresh requests
      const urlObj = new URL(url);
      urlObj.searchParams.set("_t", Date.now().toString());
      return fetch(urlObj.toString(), {
        ...options,
        cache: "no-store",
      });
    },
  },
});
