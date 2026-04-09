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

  if (code) {
    const destination = new URL(next, request.url);
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
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
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
      return supabaseResponse;
    }
  }

  let exchangeError: string | null = null;

  if (token_hash && type) {
    // Handle token_hash flow (non-PKCE / email OTP verification)
    const destination = new URL(next, request.url);
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
            cookiesToSet.forEach(({ name, value }) => {
              request.cookies.set(name, value);
            });
            supabaseResponse = NextResponse.redirect(destination);
            cookiesToSet.forEach(({ name, value, options }) => {
              supabaseResponse.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as "recovery" | "signup" | "email",
    });
    if (error) {
      exchangeError = error.message;
    } else {
      return supabaseResponse;
    }
  } else if (!code) {
    exchangeError = "Missing authentication parameters";
  }

  if (!exchangeError) {
    const destination = new URL(next, request.url);
    return NextResponse.redirect(destination);
  }

  // Exchange failed — redirect to reset-password with error instead of login
  const errorDest = new URL("/reset-password", request.url);
  errorDest.searchParams.set("error_description", exchangeError);
  return NextResponse.redirect(errorDest);
}

