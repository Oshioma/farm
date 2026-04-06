import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/reset-password";

  // Forward Supabase error params to the reset-password page
  const errorDescription = searchParams.get("error_description");
  if (errorDescription) {
    const dest = new URL("/reset-password", request.url);
    dest.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(dest);
  }

  if (code) {
    const destination = new URL(next, request.url);
    // Track cookies set by Supabase so we can re-apply them if the
    // redirect destination changes after the exchange.
    const authCookies: { name: string; value: string; options?: Record<string, unknown> }[] = [];
    let supabaseResponse = NextResponse.redirect(destination);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            authCookies.length = 0;
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              authCookies.push({ name, value, options });
            });
            supabaseResponse = NextResponse.redirect(destination);
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Attach the authenticated email so the reset-password page can
      // display who the password is being set for.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user?.email) {
        destination.searchParams.set("email", user.email);
        // Rebuild the redirect with the updated destination and re-apply
        // the auth cookies that Supabase set during the exchange.
        supabaseResponse = NextResponse.redirect(destination);
        for (const { name, value, options } of authCookies) {
          supabaseResponse.cookies.set(name, value, options as Record<string, string>);
        }
      }
      return supabaseResponse;
    }
  }

  return NextResponse.redirect(new URL("/login", request.url));
}
