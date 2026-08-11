import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  VERIFIER_COOKIE,
  encodeSession,
  sessionCookieOptions,
  toStoredSession,
} from "@/lib/auth/session";
import { exchangeCodeForSession } from "@/lib/auth/supabase";

/** OAuth 콜백 — 인가 코드를 세션으로 교환하고 httpOnly 쿠키에 저장한다. 토큰은 브라우저로 나가지 않는다. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;

  const failure = NextResponse.redirect(new URL("/login?error=1", request.nextUrl.origin));
  failure.cookies.delete(VERIFIER_COOKIE);

  if (!code || !verifier) return failure;

  try {
    const tokens = await exchangeCodeForSession(code, verifier);
    const response = NextResponse.redirect(new URL("/", request.nextUrl.origin));
    response.cookies.set(SESSION_COOKIE, encodeSession(toStoredSession(tokens)), sessionCookieOptions);
    response.cookies.delete(VERIFIER_COOKIE);
    return response;
  } catch (reason) {
    console.error("OAuth 코드 교환 실패:", reason);
    return failure;
  }
}
