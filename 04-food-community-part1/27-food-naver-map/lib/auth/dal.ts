// Data Access Layer — 서버 컴포넌트에서 현재 로그인 사용자 조회.
// 만료된 세션의 갱신은 proxy가 페이지 렌더 전에 처리하므로 여기서는 유효한 토큰만 사용한다.
import { cache } from "react";
import { isExpired, readSession } from "./session";
import { fetchAuthUser, fetchProfile, resolveImageUrl } from "./supabase";

export type CurrentUser = {
  id: string;
  email: string | null;
  nickname: string;
  imagePath: string | null;
};

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const session = await readSession();
  if (!session || isExpired(session)) return null;

  const user = await fetchAuthUser(session.accessToken);
  if (!user) return null;

  const profile = await fetchProfile(session.accessToken, user.id);
  return {
    id: user.id,
    email: user.email ?? null,
    nickname: profile?.nickname ?? user.email?.split("@")[0] ?? "이웃",
    imagePath: resolveImageUrl(profile?.image_path),
  };
});
