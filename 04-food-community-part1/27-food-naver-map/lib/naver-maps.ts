// 네이버 지도 JavaScript API v3 로더 + 최소 타입.
// 스크립트는 window 전역(window.naver.maps)에 붙으므로 문서당 한 번만 주입하고,
// 로딩 중에는 같은 Promise를 공유해 컴포넌트가 여러 개여도 중복 주입되지 않게 한다.

/** 지도 기본 중심 — 서울시청 */
export const SEOUL_CITY_HALL = { lat: 37.5666805, lng: 126.9784147 } as const;

/** 지도 기본 확대 레벨 — 건물·골목이 구분되는 수준 */
export const DEFAULT_ZOOM = 16;

/**
 * NCP 콘솔에서 발급한 Maps(Web Dynamic Map) 인증 키 ID.
 * 지도 스크립트는 브라우저가 직접 불러오므로 NEXT_PUBLIC_ 접두사가 필요하다 —
 * 키 자체는 공개되며, 보호는 NCP에 등록한 "웹 서비스 URL"(도메인 화이트리스트)이 담당한다.
 */
export const NAVER_MAP_KEY_ID = process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID;

const SCRIPT_SRC = "https://oapi.map.naver.com/openapi/v3/maps.js";
const SCRIPT_ID = "naver-maps-v3";

export type Coords = { lat: number; lng: number };

export type NaverLatLng = { lat(): number; lng(): number };

export type NaverMapListener = { readonly __brand?: "naver-listener" };

export type NaverMap = {
  getCenter(): NaverLatLng;
  setCenter(latlng: NaverLatLng): void;
  getZoom(): number;
  destroy(): void;
};

export type NaverMarker = {
  /** null을 넣으면 지도에서 뗀다 */
  setMap(map: NaverMap | null): void;
};

export type NaverMaps = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => NaverMap;
  Marker: new (options: Record<string, unknown>) => NaverMarker;
  LatLng: new (lat: number, lng: number) => NaverLatLng;
  Position: Record<string, number>;
  Event: {
    addListener(
      target: unknown,
      eventName: string,
      listener: (...args: unknown[]) => void,
    ): NaverMapListener;
    removeListener(listener: NaverMapListener): void;
  };
};

declare global {
  interface Window {
    naver?: { maps?: NaverMaps };
    /** 인증 실패 시 네이버 스크립트가 호출하는 전역 훅 — 정의하면 기본 alert 대신 이 함수가 실행된다 */
    navermap_authFailure?: () => void;
  }
}

export const MISSING_KEY_MESSAGE =
  "네이버 지도 키가 없어요 — .env.example을 참고해 NEXT_PUBLIC_NAVER_MAP_KEY_ID를 설정해주세요";

export const AUTH_FAILURE_MESSAGE =
  "네이버 지도 인증에 실패했어요 — 키와 NCP에 등록한 웹 서비스 URL을 확인해주세요";

const authFailureHandlers = new Set<() => void>();

/** 인증 실패(키 오류·미등록 도메인) 알림 구독. 반환값을 호출하면 구독이 해제된다. */
export function onNaverMapAuthFailure(handler: () => void): () => void {
  authFailureHandlers.add(handler);
  return () => authFailureHandlers.delete(handler);
}

let loading: Promise<NaverMaps> | null = null;

/** 지도 스크립트를 주입하고 window.naver.maps 네임스페이스를 돌려준다. */
export function loadNaverMaps(): Promise<NaverMaps> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("네이버 지도는 브라우저에서만 불러올 수 있어요"));
  }
  if (window.naver?.maps) return Promise.resolve(window.naver.maps);
  if (loading) return loading;
  if (!NAVER_MAP_KEY_ID) return Promise.reject(new Error(MISSING_KEY_MESSAGE));

  // 기본 alert 팝업 대신 구독자에게 전달한다
  window.navermap_authFailure = () => {
    for (const handler of authFailureHandlers) handler();
  };

  loading = new Promise<NaverMaps>((resolve, reject) => {
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `${SCRIPT_SRC}?ncpKeyId=${encodeURIComponent(NAVER_MAP_KEY_ID)}`;
    script.onload = () => {
      const maps = window.naver?.maps;
      if (maps) resolve(maps);
      else reject(new Error("네이버 지도 스크립트를 초기화하지 못했어요"));
    };
    script.onerror = () => {
      // 다음 마운트에서 다시 시도할 수 있도록 실패한 주입은 되돌린다
      loading = null;
      script.remove();
      reject(new Error("네이버 지도 스크립트를 불러오지 못했어요 — 네트워크를 확인해주세요"));
    };
    document.head.appendChild(script);
  });

  return loading;
}

/** 좌표를 소수점 6자리(≈0.1m)로 다듬어 표시용 문자열로 만든다 */
export function formatCoords({ lat, lng }: Coords): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}
