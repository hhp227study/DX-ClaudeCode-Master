import { type NextRequest, NextResponse } from "next/server";
import { authenticateRoute, withSessionCookie } from "@/lib/auth/route-session";
import { deleteStorageObject } from "@/lib/auth/supabase";
import { toPlaceDto } from "@/lib/places/dto";
import {
  deletePlaceImages,
  fetchNicknames,
  fetchPlace,
  insertPlaceImages,
  softDeletePlace,
  updatePlace,
  uploadPlaceImage,
} from "@/lib/places/supabase";
import {
  MAX_IMAGE_COUNT,
  parsePlaceLocation,
  validateContent,
  validateImageFile,
  validateTitle,
} from "@/lib/places/validation";

type Context = { params: Promise<{ id: string }> };

/** 맛집 상세 — 공개 조회 */
export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const row = await fetchPlace(id);
  if (!row) {
    return NextResponse.json({ error: "맛집을 찾을 수 없습니다" }, { status: 404 });
  }
  const nicknames = await fetchNicknames(row.user_id ? [row.user_id] : []);
  return NextResponse.json({ place: toPlaceDto(row, nicknames) });
}

/**
 * 맛집 수정 (multipart/form-data: title, content, name, address, lat, lng, keepImageIds*, images*)
 * 작성자만. 등록과 마찬가지로 지도 정보는 모두 필수다.
 */
export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await authenticateRoute(request);
  if (!result.auth) return result.response;
  const { session, user, refreshed } = result.auth;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "multipart/form-data 요청이 아닙니다" }, { status: 400 });
  }

  const title = form.get("title");
  const content = form.get("content");
  if (typeof title !== "string" || typeof content !== "string") {
    return NextResponse.json({ error: "제목과 내용을 입력해주세요" }, { status: 400 });
  }
  const fieldError = validateTitle(title) ?? validateContent(content);
  if (fieldError) {
    return NextResponse.json({ error: fieldError }, { status: 400 });
  }

  const parsedLocation = parsePlaceLocation({
    name: form.get("name"),
    address: form.get("address"),
    lat: form.get("lat"),
    lng: form.get("lng"),
  });
  if (!parsedLocation.ok) {
    return NextResponse.json({ error: parsedLocation.error }, { status: 400 });
  }
  const location = parsedLocation.location;

  const newImages = form.getAll("images").filter((v): v is File => v instanceof Blob);
  for (const image of newImages) {
    const imageError = validateImageFile(image);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }
  const keepImageIds = new Set(
    form.getAll("keepImageIds").filter((v): v is string => typeof v === "string")
  );

  const existing = await fetchPlace(id);
  if (!existing) {
    return NextResponse.json({ error: "맛집을 찾을 수 없습니다" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "본인이 등록한 맛집만 수정할 수 있습니다" }, { status: 403 });
  }

  const kept = existing.place_image.filter((img) => keepImageIds.has(img.id));
  const removed = existing.place_image.filter((img) => !keepImageIds.has(img.id));
  if (kept.length + newImages.length === 0) {
    return NextResponse.json({ error: "사진을 1장 이상 등록해주세요" }, { status: 400 });
  }
  if (kept.length + newImages.length > MAX_IMAGE_COUNT) {
    return NextResponse.json({ error: `사진은 ${MAX_IMAGE_COUNT}장까지 등록할 수 있습니다` }, { status: 400 });
  }

  // 새 이미지 업로드(스토리지) → 본문 수정 → 이미지 행 추가 → 제외 이미지 정리 순서.
  // DB에 아직 반영되지 않은 업로드만 실패 시 되돌리면 된다.
  const uploadedPaths: string[] = [];
  const cleanupUploads = () =>
    Promise.all(uploadedPaths.map((path) => deleteStorageObject(session.accessToken, path)));

  try {
    for (const image of newImages) {
      uploadedPaths.push(await uploadPlaceImage(session.accessToken, image));
    }
  } catch {
    await cleanupUploads();
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다" }, { status: 502 });
  }

  try {
    await updatePlace(session.accessToken, id, {
      title: title.trim(),
      content: content.trim(),
      location,
    });
  } catch {
    await cleanupUploads();
    return NextResponse.json({ error: "맛집 수정에 실패했습니다" }, { status: 502 });
  }

  try {
    await insertPlaceImages(session.accessToken, id, uploadedPaths);
    await deletePlaceImages(session.accessToken, id, removed.map((img) => img.id));
  } catch {
    await cleanupUploads();
    return NextResponse.json({ error: "이미지 저장에 실패했습니다" }, { status: 502 });
  }

  // 테이블에서 빠진 이미지의 스토리지 파일 정리 — 실패해도 수정은 성립하므로 best-effort
  await Promise.all(removed.map((img) => deleteStorageObject(session.accessToken, img.image_path)));

  const saved = await fetchPlace(id);
  const nicknames = await fetchNicknames([user.id]);
  const response = NextResponse.json(
    saved ? { place: toPlaceDto(saved, nicknames) } : { place: { id } }
  );
  return withSessionCookie(response, refreshed);
}

/** 맛집 소프트삭제 — 작성자만. deleted_at 기록 후 목록·상세 조회에서 제외된다 */
export async function DELETE(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const result = await authenticateRoute(request);
  if (!result.auth) return result.response;
  const { session, user, refreshed } = result.auth;

  // 이미 삭제된 글은 fetchPlace가 null을 돌려주므로 재삭제 요청도 404가 된다
  const existing = await fetchPlace(id);
  if (!existing) {
    return NextResponse.json({ error: "맛집을 찾을 수 없습니다" }, { status: 404 });
  }
  if (existing.user_id !== user.id) {
    return NextResponse.json({ error: "본인이 등록한 맛집만 삭제할 수 있습니다" }, { status: 403 });
  }

  try {
    await softDeletePlace(session.accessToken, id);
  } catch {
    return NextResponse.json({ error: "맛집 삭제에 실패했습니다" }, { status: 502 });
  }

  return withSessionCookie(NextResponse.json({ ok: true }), refreshed);
}
