// 맛집 등록·수정 공통 검증 — BFF 라우트와 클라이언트 폼이 같은 규칙을 쓴다.

export const MIN_CONTENT_LENGTH = 10;
export const MAX_CONTENT_LENGTH = 200;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_COUNT = 5;

/** 장소를 아직 고르지 않은 상태를 나타내던 값 — 지도 정보 필수화 이후로는 저장을 막는 센티넬이다 */
export const ADDRESS_PENDING = "등록 대기중";

/** 제목 필수 — 통과하면 null, 아니면 에러 메시지 */
export function validateTitle(title: string): string | null {
  if (title.trim().length === 0) return "맛집 이름을 입력해주세요";
  return null;
}

/** 내용 필수 + 10자 이상 200자 이하 — 통과하면 null, 아니면 에러 메시지 */
export function validateContent(content: string): string | null {
  const trimmed = content.trim();
  if (trimmed.length === 0) return "맛집 내용을 입력해주세요";
  if (trimmed.length < MIN_CONTENT_LENGTH) return `내용은 ${MIN_CONTENT_LENGTH}자 이상 입력해주세요`;
  if (trimmed.length > MAX_CONTENT_LENGTH) return `내용은 ${MAX_CONTENT_LENGTH}자 이하로 입력해주세요`;
  return null;
}

/** 폼/쿼리로 온 좌표 문자열을 유효한 WGS84 값으로만 통과시킨다 */
export function parseCoordinate(raw: unknown, limit: 90 | 180): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

export type PlaceLocation = {
  /** 장소명 */
  name: string;
  /** 지번주소 */
  address: string;
  lat: number | null;
  lng: number | null;
};

/**
 * 지도 정보(장소명·지번주소·좌표)는 모두 필수 — 하나라도 비면 등록·수정을 막는다.
 * 통과하면 null, 아니면 에러 메시지.
 */
export function validatePlaceLocation(location: PlaceLocation): string | null {
  if (location.name.trim().length === 0) return "장소를 검색해 선택해주세요";
  const address = location.address.trim();
  if (address.length === 0) return "지도를 움직여 주소를 확인해주세요";
  if (address === ADDRESS_PENDING) return "지도에서 위치를 지정해 주소를 채워주세요";
  if (parseCoordinate(location.lat, 90) === null) return "위치(위도)가 올바르지 않아요";
  if (parseCoordinate(location.lng, 180) === null) return "위치(경도)가 올바르지 않아요";
  return null;
}

/** 저장 가능한 지도 정보 — 검증을 통과해 좌표가 확정된 형태 */
export type StoredPlaceLocation = { name: string; address: string; lat: number; lng: number };

/**
 * 폼 필드(문자열)를 저장 가능한 지도 정보로 파싱한다.
 * 검증과 좁히기를 한 번에 해서 라우트가 non-null 단언 없이 값을 쓸 수 있게 한다.
 */
export function parsePlaceLocation(fields: {
  name: unknown;
  address: unknown;
  lat: unknown;
  lng: unknown;
}): { ok: true; location: StoredPlaceLocation } | { ok: false; error: string } {
  const name = typeof fields.name === "string" ? fields.name : "";
  const address = typeof fields.address === "string" ? fields.address : "";
  const lat = parseCoordinate(fields.lat, 90);
  const lng = parseCoordinate(fields.lng, 180);

  const error = validatePlaceLocation({ name, address, lat, lng });
  if (error) return { ok: false, error };
  // validatePlaceLocation이 통과했으면 좌표는 유효한 숫자다 (타입을 좁히기 위한 재확인)
  if (lat === null || lng === null) return { ok: false, error: "위치가 올바르지 않아요" };

  return { ok: true, location: { name: name.trim(), address: address.trim(), lat, lng } };
}

/** 업로드 파일 1건 검사 — 이미지 타입·용량 */
export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!file.type.startsWith("image/")) return "이미지 파일만 올릴 수 있습니다";
  if (file.size > MAX_IMAGE_BYTES) return "이미지는 5MB 이하만 올릴 수 있습니다";
  return null;
}
