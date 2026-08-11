// 라우트 핸들러용 세션 검증 — /api는 proxy 매처 밖이므로 토큰 갱신도 여기서 직접 처리한다.
// (기존 /api/auth/me·/api/profile의 반복 로직을 공통화)
import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  type StoredSession,
  decodeSession,
  encodeSession,
  isExpired,
  sessionCookieOptions,
  toStoredSession,
} from "./session";
import { type SupabaseUser, fetchAuthUser, refreshSession } from "./supabase";

export type RouteAuth = {
  session: StoredSession;
  user: SupabaseUser;
  /** 만료로 갱신된 세션 — withSessionCookie로 응답에 되돌려줘야 한다 */
  refreshed: StoredSession | null;
};

export async function authenticateRoute(
  request: NextRequest
): Promise<{ auth: RouteAuth; response?: never } | { auth: null; response: NextResponse }> {
  const unauthorized = (clearCookie: boolean) => {
    const response = NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    if (clearCookie) response.cookies.delete(SESSION_COOKIE);
    return response;
  };

  let session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return { auth: null, response: unauthorized(false) };

  let refreshed: StoredSession | null = null;
  if (isExpired(session)) {
    try {
      refreshed = toStoredSession(await refreshSession(session.refreshToken));
      session = refreshed;
    } catch {
      return { auth: null, response: unauthorized(true) };
    }
  }

  const user = await fetchAuthUser(session.accessToken);
  if (!user) return { auth: null, response: unauthorized(true) };

  return { auth: { session, user, refreshed } };
}

/** 갱신된 세션이 있으면 응답 쿠키에 반영 */
export function withSessionCookie(response: NextResponse, refreshed: StoredSession | null): NextResponse {
  if (refreshed) {
    response.cookies.set(SESSION_COOKIE, encodeSession(refreshed), sessionCookieOptions);
  }
  return response;
}
