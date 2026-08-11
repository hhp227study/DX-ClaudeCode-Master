import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  decodeSession,
  encodeSession,
  isExpired,
  sessionCookieOptions,
  toStoredSession,
} from "@/lib/auth/session";
import { refreshSession } from "@/lib/auth/supabase";

const PROTECTED_PATHS = ["/my", "/restaurants/new"];

export default async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Supabase redirect allow-list에 콜백이 없으면 코드가 사이트 루트로 떨어진다 — 콜백으로 회송
  if (pathname === "/" && searchParams.has("code")) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/api/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  let session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  let refreshedValue: string | null = null;
  let shouldClear = false;

  // 액세스 토큰 만료 시 페이지 렌더 전에 갱신 — 서버 컴포넌트는 항상 유효한 토큰만 본다
  if (session && isExpired(session)) {
    try {
      session = toStoredSession(await refreshSession(session.refreshToken));
      refreshedValue = encodeSession(session);
      request.cookies.set(SESSION_COOKIE, refreshedValue);
    } catch {
      session = null;
      shouldClear = true;
    }
  }

  const applyCookies = (response: NextResponse) => {
    if (refreshedValue) response.cookies.set(SESSION_COOKIE, refreshedValue, sessionCookieOptions);
    if (shouldClear) response.cookies.delete(SESSION_COOKIE);
    return response;
  };

  const isProtected =
    PROTECTED_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`)) ||
    /^\/restaurants\/[^/]+\/edit$/.test(pathname);
  if (isProtected && !session) {
    return applyCookies(NextResponse.redirect(new URL("/login", request.nextUrl)));
  }
  if (pathname === "/login" && session) {
    return applyCookies(NextResponse.redirect(new URL("/", request.nextUrl)));
  }

  return applyCookies(NextResponse.next({ request }));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
