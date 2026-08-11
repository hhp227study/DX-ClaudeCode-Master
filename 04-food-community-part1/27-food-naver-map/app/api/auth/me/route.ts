import { type NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE,
  type StoredSession,
  decodeSession,
  encodeSession,
  isExpired,
  sessionCookieOptions,
  toStoredSession,
} from "@/lib/auth/session";
import { fetchAuthUser, fetchProfile, refreshSession, resolveImageUrl } from "@/lib/auth/supabase";

/** 클라이언트 컴포넌트용 세션 조회 — /api는 proxy 매처 밖이므로 토큰 갱신도 여기서 직접 처리한다 */
export async function GET(request: NextRequest) {
  let session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  let refreshed: StoredSession | null = null;
  if (isExpired(session)) {
    try {
      refreshed = toStoredSession(await refreshSession(session.refreshToken));
      session = refreshed;
    } catch {
      const response = NextResponse.json({ user: null }, { status: 401 });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  const user = await fetchAuthUser(session.accessToken);
  if (!user) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  const profile = await fetchProfile(session.accessToken, user.id);
  const response = NextResponse.json({
    user: {
      id: user.id,
      email: user.email ?? null,
      nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "이웃",
      imagePath: resolveImageUrl(profile?.image_path),
    },
  });
  if (refreshed) {
    response.cookies.set(SESSION_COOKIE, encodeSession(refreshed), sessionCookieOptions);
  }
  return response;
}
