import { type NextRequest, NextResponse } from "next/server";
import { authenticateRoute, withSessionCookie } from "@/lib/auth/route-session";
import { deleteStorageObject } from "@/lib/auth/supabase";
import { toPlaceDto } from "@/lib/places/dto";
import {
  deletePlace,
  fetchNicknames,
  fetchPlace,
  fetchPlaces,
  insertPlace,
  insertPlaceImages,
  uploadPlaceImage,
} from "@/lib/places/supabase";
import {
  MAX_IMAGE_COUNT,
  parsePlaceLocation,
  validateContent,
  validateImageFile,
  validateTitle,
} from "@/lib/places/validation";

/** 맛집 목록 — 공개 조회 */
export async function GET() {
  try {
    const rows = await fetchPlaces();
    const nicknames = await fetchNicknames(rows.map((r) => r.user_id).filter((v): v is string => !!v));
    return NextResponse.json({ places: rows.map((row) => toPlaceDto(row, nicknames)) });
  } catch {
    return NextResponse.json({ error: "맛집 목록을 불러오지 못했습니다" }, { status: 502 });
  }
}

/**
 * 맛집 등록 (multipart/form-data: title, content, name, address, lat, lng, images*)
 * 지도 정보는 모두 필수 — 하나라도 비면 400으로 막는다.
 */
export async function POST(request: NextRequest) {
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

  const images = form.getAll("images").filter((v): v is File => v instanceof Blob);
  if (images.length === 0) {
    return NextResponse.json({ error: "사진을 1장 이상 등록해주세요" }, { status: 400 });
  }
  if (images.length > MAX_IMAGE_COUNT) {
    return NextResponse.json({ error: `사진은 ${MAX_IMAGE_COUNT}장까지 등록할 수 있습니다` }, { status: 400 });
  }
  for (const image of images) {
    const imageError = validateImageFile(image);
    if (imageError) return NextResponse.json({ error: imageError }, { status: 400 });
  }

  // 스토리지 업로드 → place → place_image 순서로 저장하고, 중간 실패 시 앞 단계를 되돌린다
  const uploadedPaths: string[] = [];
  const cleanupUploads = () =>
    Promise.all(uploadedPaths.map((path) => deleteStorageObject(session.accessToken, path)));

  try {
    for (const image of images) {
      uploadedPaths.push(await uploadPlaceImage(session.accessToken, image));
    }
  } catch {
    await cleanupUploads();
    return NextResponse.json({ error: "이미지 업로드에 실패했습니다" }, { status: 502 });
  }

  let placeId: string;
  try {
    const place = await insertPlace(session.accessToken, {
      title: title.trim(),
      content: content.trim(),
      userId: user.id,
      location,
    });
    placeId = place.id;
  } catch {
    await cleanupUploads();
    return NextResponse.json({ error: "맛집 등록에 실패했습니다" }, { status: 502 });
  }

  try {
    await insertPlaceImages(session.accessToken, placeId, uploadedPaths);
  } catch {
    await deletePlace(session.accessToken, placeId);
    await cleanupUploads();
    return NextResponse.json({ error: "이미지 저장에 실패했습니다" }, { status: 502 });
  }

  const saved = await fetchPlace(placeId);
  const nicknames = await fetchNicknames([user.id]);
  const response = NextResponse.json(
    saved ? { place: toPlaceDto(saved, nicknames) } : { place: { id: placeId } },
    { status: 201 }
  );
  return withSessionCookie(response, refreshed);
}
