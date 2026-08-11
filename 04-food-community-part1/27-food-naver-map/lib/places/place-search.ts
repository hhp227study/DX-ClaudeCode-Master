// 장소 검색·선택의 공용 타입과 상수 — 클라이언트(폼·검색 오버레이)와 서버(BFF)가 함께 쓴다.
// 네이버 API를 실제로 부르는 코드는 서버 전용인 naver-local-search.ts에 있다.
import { SEOUL_CITY_HALL } from "@/lib/naver-maps";
import { ADDRESS_PENDING } from "./validation";

/** 지역검색 API의 display 상한(문서 기준 1~5) — 한 번에 최대 5건까지만 받을 수 있다 */
export const LOCAL_SEARCH_MAX_RESULTS = 5;

/** 이 글자 수 미만이면 검색을 걸지 않는다 */
export const MIN_QUERY_LENGTH = 2;

/** 입력이 멎고 이만큼 지나면 검색한다 (타이핑 중 매 글자 호출 방지) */
export const SEARCH_DEBOUNCE_MS = 400;

/** 지도가 멎고 이만큼 지나면 리버스 지오코딩을 건다 (드래그 중 연속 호출 방지) */
export const REVERSE_GEOCODE_DEBOUNCE_MS = 500;

/** 지역검색 결과 1건 */
export type LocalPlace = {
  /** 목록 key — API가 식별자를 주지 않아 좌표·이름으로 합성한다 */
  id: string;
  /** 업체명 (검색 강조용 <b> 태그를 제거한 순수 텍스트) */
  name: string;
  category: string;
  /** 지번주소 (응답의 address) */
  address: string;
  /** 도로명주소 (응답의 roadAddress) */
  roadAddress: string;
  /** WGS84 위도 — 좌표를 신뢰할 수 없으면 null */
  lat: number | null;
  /** WGS84 경도 — 좌표를 신뢰할 수 없으면 null */
  lng: number | null;
};

/** 폼이 들고 있는 선택된 장소 */
export type PlaceSelection = {
  /** 검색창에 표시할 장소명 */
  name: string;
  /** 주소 영역에 표시할 지번주소 */
  address: string;
  lat: number;
  lng: number;
  /** 검색 결과가 아니라 사용자가 직접 입력한 이름인지 — 주소·좌표는 기본값 그대로다 */
  manual: boolean;
};

/**
 * 아직 장소를 고르지 않은 상태. 지도는 서울시청에서 시작하고 주소는 센티넬 값이라
 * 이 상태로는 등록·수정이 막힌다 — 검색으로 고르거나 지도를 움직여 주소를 채워야 한다.
 */
export const DEFAULT_PLACE: PlaceSelection = {
  name: "",
  address: ADDRESS_PENDING,
  lat: SEOUL_CITY_HALL.lat,
  lng: SEOUL_CITY_HALL.lng,
  manual: false,
};

/** 검색 결과 → 폼 선택값. 좌표가 없는 결과는 기본 좌표를 유지한다. */
export function toPlaceSelection(item: LocalPlace): PlaceSelection {
  const hasCoords = item.lat !== null && item.lng !== null;
  return {
    name: item.name,
    address: item.address || item.roadAddress || DEFAULT_PLACE.address,
    lat: hasCoords ? item.lat! : DEFAULT_PLACE.lat,
    lng: hasCoords ? item.lng! : DEFAULT_PLACE.lng,
    manual: false,
  };
}

/** 직접입력 → 폼 선택값. 이름만 반영하고 주소·좌표는 기본값을 유지한다. */
export function toManualSelection(name: string): PlaceSelection {
  return { ...DEFAULT_PLACE, name: name.trim(), manual: true };
}

/**
 * 저장된 글 → 수정 폼의 초기 선택값.
 * 지도 정보가 없던 시절의 글은 기본값으로 시작하고, 그대로는 저장이 막히므로
 * 사용자가 장소를 고르거나 지도를 움직여 채워야 한다.
 */
export function toSelectionFromStored(stored: {
  name: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
}): PlaceSelection {
  return {
    name: stored.name ?? "",
    address: stored.address ?? DEFAULT_PLACE.address,
    lat: stored.lat ?? DEFAULT_PLACE.lat,
    lng: stored.lng ?? DEFAULT_PLACE.lng,
    manual: false,
  };
}
