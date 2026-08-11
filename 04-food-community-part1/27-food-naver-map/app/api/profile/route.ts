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
import {
  deleteStorageObject,
  fetchAuthUser,
  fetchProfile,
  refreshSession,
  resolveImageUrl,
  uploadProfileImage,
  upsertProfile,
} from "@/lib/auth/supabase";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NICKNAME_LENGTH = 20;

/** 프로필 변경(닉네임·이미지, multipart/form-data) — /api는 proxy 매처 밖이므로 토큰 갱신도 여기서 직접 처리한다 */
export async function PATCH(request: NextRequest) {
  let session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
  }

  let refreshed: StoredSession | null = null;
  if (isExpired(session)) {
    try {
      refreshed = toStoredSession(await refreshSession(session.refreshToken));
      session = refreshed;
    } catch {
      const response = NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
      response.cookies.delete(SESSION_COOKIE);
      return response;
    }
  }

  const user = await fetchAuthUser(session.accessToken);
  if (!user) {
    const response = NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data 요청이 아닙니다" }, { status: 400 });
  }

  const nickname = form.get("nickname");
  if (typeof nickname !== "string" || nickname.trim().length === 0) {
    return NextResponse.json({ error: "닉네임을 입력해주세요" }, { status: 400 });
  }
  const trimmedNickname = nickname.trim();
  if (trimmedNickname.length > MAX_NICKNAME_LENGTH) {
    return NextResponse.json(
      { error: `닉네임은 ${MAX_NICKNAME_LENGTH}자 이하로 입력해주세요` },
      { status: 400 }
    );
  }

  const image = form.get("image");
  if (image !== null && !(image instanceof Blob)) {
    return NextResponse.json({ error: "이미지 형식이 올바르지 않습니다" }, { status: 400 });
  }
  if (image && !image.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 올릴 수 있습니다" }, { status: 400 });
  }
  if (image && image.size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "이미지는 5MB 이하만 올릴 수 있습니다" }, { status: 400 });
  }

  // 업서트 전에 조회해둬야 교체된 예전 이미지를 정리할 수 있다
  const current = await fetchProfile(session.accessToken, user.id);

  let newImagePath: string | undefined;
  if (image && image.size > 0) {
    try {
      newImagePath = await uploadProfileImage(session.accessToken, image);
    } catch {
      return NextResponse.json({ error: "이미지 업로드에 실패했습니다" }, { status: 502 });
    }
  }

  try {
    const profile = await upsertProfile(session.accessToken, user.id, {
      nickname: trimmedNickname,
      ...(newImagePath ? { image_path: newImagePath } : {}),
    });

    // 새 이미지로 교체됐으면 이전 스토리지 파일은 고아가 되므로 정리 (외부 URL은 제외)
    if (newImagePath && current?.image_path && !current.image_path.startsWith("http")) {
      await deleteStorageObject(session.accessToken, current.image_path);
    }

    const response = NextResponse.json({
      profile: {
        nickname: profile.nickname,
        imagePath: resolveImageUrl(profile.image_path),
      },
    });
    if (refreshed) {
      response.cookies.set(SESSION_COOKIE, encodeSession(refreshed), sessionCookieOptions);
    }
    return response;
  } catch {
    // 프로필 저장 실패 시 방금 올린 이미지가 고아로 남지 않게 정리
    if (newImagePath) {
      await deleteStorageObject(session.accessToken, newImagePath);
    }
    return NextResponse.json({ error: "프로필 저장에 실패했습니다" }, { status: 502 });
  }
}
