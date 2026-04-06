import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = new URL(request.url);

  // Redirect /reset-password?code=... to /auth/callback for server-side code exchange
  const code = searchParams.get("code");
  if (pathname === "/reset-password" && code) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("code", code);
    callbackUrl.searchParams.set("next", "/reset-password");
    return NextResponse.redirect(callbackUrl);
  }

  // Handle Supabase token_hash links (e.g. /auth/confirm?token_hash=...&type=recovery)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (pathname === "/auth/confirm" && tokenHash && type) {
    const callbackUrl = new URL("/auth/callback", request.url);
    callbackUrl.searchParams.set("token_hash", tokenHash);
    callbackUrl.searchParams.set("type", type);
    callbackUrl.searchParams.set("next", type === "recovery" ? "/reset-password" : "/farm");
    return NextResponse.redirect(callbackUrl);
  }

  // Protected routes — check auth
  const protectedPaths = ["/farm", "/plants", "/admin"];
  const isProtected = protectedPaths.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isProtected) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/farm/:path*", "/plants/:path*", "/admin/:path*", "/reset-password", "/auth/confirm"],
};
