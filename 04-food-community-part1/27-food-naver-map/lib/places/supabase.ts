// 맛집 CRUD — Supabase PostgREST·Storage 호출 래퍼. BFF 서버에서만 사용한다.
// 목록·상세는 공개(anon RLS), 등록·수정은 로그인 사용자 토큰으로 호출한다.

const PLACE_IMAGE_BUCKET = "place-image";

export type PlaceImageRow = {
  id: string;
  image_path: string;
};

export type PlaceRow = {
  id: string;
  title: string;
  content: string;
  /** 지번주소 */
  address: string;
  /** 장소명 — 지도 정보 필수화 이전 행은 null일 수 있다 */
  name: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  user_id: string | null;
  place_image: PlaceImageRow[];
};

const PLACE_SELECT =
  "id,title,content,address,name,lat,lng,created_at,user_id,place_image(id,image_path)";

/** 등록·수정이 함께 쓰는 지도 정보 컬럼 */
export type PlaceLocationInput = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

function requireEnv(name: "SUPABASE_URL" | "SUPABASE_PUBLISHABLE_KEY"): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 설정되지 않았습니다 (.env.local)`);
  return value;
}

/** 공개 조회는 accessToken 없이 anon 권한으로, 쓰기는 로그인 사용자 토큰으로 호출한다 */
function restHeaders(accessToken?: string): Record<string, string> {
  const apikey = requireEnv("SUPABASE_PUBLISHABLE_KEY");
  return {
    apikey,
    Authorization: `Bearer ${accessToken ?? apikey}`,
  };
}

/** 맛집 목록 — 이미지 경로 포함, 최신순. 소프트삭제된 글은 제외 */
export async function fetchPlaces(): Promise<PlaceRow[]> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("select", PLACE_SELECT);
  url.searchParams.set("deleted_at", "is.null");
  url.searchParams.set("order", "created_at.desc");
  const res = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`맛집 목록 조회 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** 맛집 상세 — 소프트삭제됐거나 없으면 null */
export async function fetchPlace(id: string): Promise<PlaceRow | null> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("id", `eq.${id}`);
  url.searchParams.set("deleted_at", "is.null");
  url.searchParams.set("select", PLACE_SELECT);
  const res = await fetch(url, {
    headers: { ...restHeaders(), Accept: "application/vnd.pgrst.object+json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

/** 특정 사용자가 쓴 맛집 목록 — 마이페이지용, 소프트삭제 제외, 최신순 */
export async function fetchPlacesByUser(userId: string): Promise<PlaceRow[]> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("select", PLACE_SELECT);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("deleted_at", "is.null");
  url.searchParams.set("order", "created_at.desc");
  const res = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!res.ok) {
    throw new Error(`내가 쓴 맛집 조회 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** 작성자 닉네임 일괄 조회 — user_id → nickname 맵 */
export async function fetchNicknames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return new Map();
  const url = new URL("/rest/v1/profile", requireEnv("SUPABASE_URL"));
  url.searchParams.set("user_id", `in.(${ids.join(",")})`);
  url.searchParams.set("select", "user_id,nickname");
  const res = await fetch(url, { headers: restHeaders(), cache: "no-store" });
  if (!res.ok) return new Map();
  const rows: { user_id: string; nickname: string }[] = await res.json();
  return new Map(rows.map((r) => [r.user_id, r.nickname]));
}

/** 맛집 등록 — 지도 정보(장소명·지번주소·좌표)는 라우트에서 검증된 값만 들어온다 */
export async function insertPlace(
  accessToken: string,
  input: { title: string; content: string; userId: string; location: PlaceLocationInput }
): Promise<PlaceRow> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  const res = await fetch(url, {
    method: "POST",
    headers: {
      ...restHeaders(accessToken),
      "Content-Type": "application/json",
      Accept: "application/vnd.pgrst.object+json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title: input.title,
      content: input.content,
      user_id: input.userId,
      name: input.location.name,
      address: input.location.address,
      lat: input.location.lat,
      lng: input.location.lng,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`맛집 등록 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** 맛집 제목·내용·지도 정보 수정 — RLS로 작성자 본인만 통과한다 */
export async function updatePlace(
  accessToken: string,
  id: string,
  patch: { title: string; content: string; location: PlaceLocationInput }
): Promise<PlaceRow> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("id", `eq.${id}`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      ...restHeaders(accessToken),
      "Content-Type": "application/json",
      Accept: "application/vnd.pgrst.object+json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      title: patch.title,
      content: patch.content,
      name: patch.location.name,
      address: patch.location.address,
      lat: patch.location.lat,
      lng: patch.location.lng,
    }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`맛집 수정 실패 (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** 맛집 소프트삭제 — 행은 남기고 deleted_at만 기록한다. RLS로 작성자 본인만 통과한다 */
export async function softDeletePlace(accessToken: string, id: string): Promise<void> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("id", `eq.${id}`);
  const res = await fetch(url, {
    method: "PATCH",
    headers: { ...restHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({ deleted_at: new Date().toISOString() }),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`맛집 삭제 실패 (${res.status}): ${await res.text()}`);
  }
}

/** 등록 도중 이미지 저장이 실패했을 때의 롤백용 — 실패해도 진행하는 best-effort */
export async function deletePlace(accessToken: string, id: string): Promise<void> {
  const url = new URL("/rest/v1/place", requireEnv("SUPABASE_URL"));
  url.searchParams.set("id", `eq.${id}`);
  await fetch(url, { method: "DELETE", headers: restHeaders(accessToken), cache: "no-store" }).catch(
    () => {}
  );
}

/** 이미지 경로들을 place_image 테이블에 저장 */
export async function insertPlaceImages(
  accessToken: string,
  placeId: string,
  imagePaths: string[]
): Promise<void> {
  if (imagePaths.length === 0) return;
  const url = new URL("/rest/v1/place_image", requireEnv("SUPABASE_URL"));
  const res = await fetch(url, {
    method: "POST",
    headers: { ...restHeaders(accessToken), "Content-Type": "application/json" },
    body: JSON.stringify(imagePaths.map((image_path) => ({ place_id: placeId, image_path }))),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`이미지 경로 저장 실패 (${res.status}): ${await res.text()}`);
  }
}

/** 수정에서 제외된 이미지 행 삭제 */
export async function deletePlaceImages(
  accessToken: string,
  placeId: string,
  imageIds: string[]
): Promise<void> {
  if (imageIds.length === 0) return;
  const url = new URL("/rest/v1/place_image", requireEnv("SUPABASE_URL"));
  url.searchParams.set("place_id", `eq.${placeId}`);
  url.searchParams.set("id", `in.(${imageIds.join(",")})`);
  const res = await fetch(url, {
    method: "DELETE",
    headers: restHeaders(accessToken),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`이미지 삭제 실패 (${res.status}): ${await res.text()}`);
  }
}

/** 맛집 사진을 place-image 버킷에 uuidv4 파일명으로 업로드하고 테이블 저장용 경로를 돌려준다 */
export async function uploadPlaceImage(accessToken: string, file: Blob): Promise<string> {
  const path = `${PLACE_IMAGE_BUCKET}/${crypto.randomUUID()}`;
  const res = await fetch(`${requireEnv("SUPABASE_URL")}/storage/v1/object/${path}`, {
    method: "POST",
    headers: {
      ...restHeaders(accessToken),
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
