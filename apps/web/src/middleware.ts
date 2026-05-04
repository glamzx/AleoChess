/**
 * Combined Supabase auth + next-intl locale middleware.
 *
 * 1. Refreshes the Supabase session cookie on every request
 * 2. Reads NEXT_LOCALE cookie to determine user's preferred language
 */

import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "@aleo/shared/db-types";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Read NEXT_LOCALE cookie and set it as a header for next-intl to pick up
  const localeCookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (localeCookie) {
    response.headers.set("x-next-intl-locale", localeCookie);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
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

  await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|engine/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|wav|wasm)$).*)"
  ]
};
