// 세션 쿠키 인코딩/디코딩 — proxy(NextRequest)와 라우트 핸들러(cookies()) 양쪽에서 쓰는 공통 계층.
import { cookies } from "next/headers";
import type { TokenResponse } from "./supabase";

export const SESSION_COOKIE = "sb-session";
export const VERIFIER_COOKIE = "sb-pkce-verifier";

export type StoredSession = {
  accessToken: string;
  refreshToken: string;
  /** epoch seconds */
  expiresAt: number;
};

const isProd = process.env.NODE_ENV === "production";

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  path: "/",
  // 리프레시 토큰 수명 동안 유지 (Supabase 기본 무제한 — 30일 후 재로그인)
  maxAge: 60 * 60 * 24 * 30,
} as const;

export const verifierCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: isProd,
  path: "/",
  maxAge: 60 * 10,
} as const;

export function toStoredSession(tokens: TokenResponse): StoredSession {
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
  };
}

export function encodeSession(session: StoredSession): string {
  return Buffer.from(JSON.stringify(session)).toString("base64url");
}

export function decodeSession(raw: string | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString());
    if (typeof parsed?.accessToken !== "string" || typeof parsed?.refreshToken !== "string") {
      return null;
    }
    return parsed as StoredSession;
  } catch {
    return null;
  }
}

/** 만료 60초 전부터 만료로 간주해 요청 도중 토큰이 죽는 상황을 피한다 */
export function isExpired(session: StoredSession, skewSeconds = 60): boolean {
  return session.expiresAt - skewSeconds <= Math.floor(Date.now() / 1000);
}

/** 서버 컴포넌트·라우트 핸들러에서 현재 요청의 세션 쿠키 읽기 */
export async function readSession(): Promise<StoredSession | null> {
  const store = await cookies();
  return decodeSession(store.get(SESSION_COOKIE)?.value);
}
