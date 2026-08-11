// Supabase Auth(GoTrue)·PostgREST·Storage 호출 래퍼 — BFF 서버에서만 사용한다.
// 토큰은 라우트 핸들러/proxy의 httpOnly 쿠키로만 오가고 브라우저 JS에는 노출되지 않는다.

export type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: SupabaseUser;
};

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
};

export type Profile = {
  nickname: string;
  image_path: string | null;
};

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY" | "SUPABASE_STORAGE_URL"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다 (.env.local)`);
  return value;
}

/** Google 인가 시작 URL (PKCE). 인증 후 Supabase가 redirectTo로 ?code=…를 돌려준다. */
export function buildAuthorizeUrl(params: { redirectTo: string; codeChallenge: string }): string {
  const url = new URL("/auth/v1/authorize", requireEnv("SUPABASE_URL"));
  url.searchParams.set("provider", "google");
  url.searchParams.set("redirect_to", params.redirectTo);
  url.searchParams.set("code_challenge", params.codeChallenge);
  url.searchParams.set("code_challenge_method", "s256");
  return url.toString();
}

async function tokenRequest(grantType: "pkce" | "refresh_token", body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(`${requireEnv("SUPABASE_URL")}/auth/v1/token?grant_type=${grantType}`, {
    method: "POST",
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`토큰 발급 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

export function exchangeCodeForSession(code: string, codeVerifier: string): Promise<TokenResponse> {
  return tokenRequest("pkce", { auth_code: code, code_verifier: codeVerifier });
}

export function refreshSession(refreshToken: string): Promise<TokenResponse> {
  return tokenRequest("refresh_token", { refresh_token: refreshToken });
}

export async function fetchAuthUser(accessToken: string): Promise<SupabaseUser | null> {
  const res = await fetch(`${requireEnv("SUPABASE_URL")}/auth/v1/user`, {
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function fetchProfile(accessToken: string, userId: string): Promise<Profile | null> {
  const url = new URL("/rest/v1/profile", requireEnv("SUPABASE_URL"));
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("select", "nickname,image_path");
  const res = await fetch(url, {
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.pgrst.object+json",
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

const PROFILE_IMAGE_BUCKET = "profile-image";

/** 테이블의 image_path(버킷 포함 스토리지 경로 또는 외부 URL)를 브라우저가 쓸 절대 URL로 변환 */
export function resolveImageUrl(imagePath: string | null | undefined): string | null {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath; // 구글 아바타 등 외부 URL은 그대로
  return `${requireEnv("SUPABASE_STORAGE_URL")}/${imagePath}`;
}

/** 프로필 이미지를 profile-image 버킷에 uuidv4 파일명으로 업로드하고 테이블 저장용 경로를 돌려준다 */
export async function uploadProfileImage(accessToken: string, file: Blob): Promise<string> {
  const path = `${PROFILE_IMAGE_BUCKET}/${crypto.randomUUID()}`;
  const res = await fetch(`${requireEnv("SUPABASE_URL")}/storage/v1/object/${path}`, {
    method: "POST",
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`이미지 업로드 실패 (${res.status}): ${await res.text()}`);
  }
  return path;
}

/** 교체되어 더 이상 참조되지 않는 스토리지 파일 삭제 — 실패해도 프로필 변경은 성립하므로 best-effort */
export async function deleteStorageObject(accessToken: string, path: string): Promise<void> {
  await fetch(`${requireEnv("SUPABASE_URL")}/storage/v1/object/${path}`, {
    method: "DELETE",
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  }).catch(() => {});
}

/** user_id 기준 업서트 — 구글 로그인 사용자의 첫 프로필 저장(insert)과 이후 변경(update)을 모두 처리 */
export async function upsertProfile(
  accessToken: string,
  userId: string,
  patch: { nickname: string; image_path?: string }
): Promise<Profile> {
  const url = new URL("/rest/v1/profile", requireEnv("SUPABASE_URL"));
  url.searchParams.set("on_conflict", "user_id");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.pgrst.object+json",
      Prefer: "resolution=merge-duplicates,return=representation",
    },
    body: JSON.stringify({ user_id: userId, ...patch }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`프로필 저장 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** Supabase 쪽 세션(리프레시 토큰) 폐기. 실패해도 쿠키 삭제로 로그아웃은 성립하므로 best-effort. */
export async function revokeSession(accessToken: string): Promise<void> {
  await fetch(`${requireEnv("SUPABASE_URL")}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: requireEnv("SUPABASE_PUBLISHABLE_KEY"),
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  }).catch(() => {});
}
