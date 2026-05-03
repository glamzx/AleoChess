/**
 * Supabase auth middleware.
 *
 * Refreshes the Supabase session cookie on every request, so the user stays
 * logged in across server-rendered navigations. Without this, expired access
 * tokens make Server Components see `getUser()` as null even when the user
 * just refreshed in the browser.
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import type { Database } from "@aleo/shared/db-types";
import { defaultLocale, locales } from "@/i18n-config";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always"
});

export async function middleware(request: NextRequest) {
  // Bypass middleware when serving locally (helps local dev hosting).
  // Some environments (local prod start) send host header like "localhost:3000".
  const host = request.headers.get("host") ?? "";
  if (host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
    return NextResponse.next();
  }

  const response = intlMiddleware(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // Boot without Supabase configured (e.g. CI smoke tests). Don't crash —
    // just skip session refresh.
    return response;
  }

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      }
    }
  });

  // Touching getUser() forces the session refresh + cookie write if needed.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    // Run on every page route except static assets and the engine WASM glue.
    "/((?!api|_next/static|_next/image|favicon.ico|engine/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|wasm)$).*)"
  ]
};
