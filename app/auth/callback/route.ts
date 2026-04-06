import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/reset-password";

  // Forward Supabase error params to the reset-password page
  const errorDescription = searchParams.get("error_description");
  if (errorDescription) {
    const dest = new URL("/reset-password", request.url);
    dest.searchParams.set("error_description", errorDescription);
    return NextResponse.redirect(dest);
  }

  const destination = new URL(next, request.url);
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

  let exchangeError: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) exchangeError = error.message;
  } else if (token_hash && type) {
    // Handle token_hash flow (non-PKCE / email OTP verification)
    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "signup" | "email",
    });
    if (error) exchangeError = error.message;
  } else {
    exchangeError = "Missing authentication parameters";
  }

  if (!exchangeError) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user?.email) {
      destination.searchParams.set("email", user.email);
      supabaseResponse = NextResponse.redirect(destination);
      for (const { name, value, options } of authCookies) {
        supabaseResponse.cookies.set(name, value, options as Record<string, string>);
      }
    }
    return supabaseResponse;
  }

  // Exchange failed — redirect to reset-password with error instead of login
  const errorDest = new URL("/reset-password", request.url);
  errorDest.searchParams.set("error_description", exchangeError);
  return NextResponse.redirect(errorDest);
}
