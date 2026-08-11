import { type NextRequest, NextResponse } from "next/server";
import { createPkcePair } from "@/lib/auth/pkce";
import { VERIFIER_COOKIE, verifierCookieOptions } from "@/lib/auth/session";
import { buildAuthorizeUrl } from "@/lib/auth/supabase";

/** BFF 로그인 진입점 — PKCE verifier를 httpOnly 쿠키에 심고 Supabase 구글 인가로 보낸다 */
export async function GET(request: NextRequest) {
  const { verifier, challenge } = createPkcePair();
  const redirectTo = new URL("/api/auth/callback", request.nextUrl.origin).toString();

  const response = NextResponse.redirect(
    buildAuthorizeUrl({ redirectTo, codeChallenge: challenge })
  );
  response.cookies.set(VERIFIER_COOKIE, verifier, verifierCookieOptions);
  return response;
}
