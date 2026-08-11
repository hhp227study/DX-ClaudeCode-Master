// 네이버 리버스 지오코딩(NCP Maps — Reverse Geocoding) 서버 전용 클라이언트.
// 좌표 → 지번주소. Client Secret이 필요하므로 BFF 라우트에서만 호출한다.
// 문서: https://api.ncloud-docs.com/docs/application-maps-reversegeocoding

const ENDPOINT = "https://maps.apigw.ntruss.com/map-reversegeocode/v2/gc";

export type ReverseGeocodeResult =
  | { ok: true; address: string | null }
  | { ok: false; status: number; error: string };

type Area = { name?: unknown };
type Land = { type?: unknown; number1?: unknown; number2?: unknown };
type GcResult = {
  name?: unknown;
  region?: Record<string, Area | undefined>;
  land?: Land;
};

/** 빈 문자열·"0"은 값이 없는 것으로 본다 (부번이 없을 때 두 형태가 다 온다) */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return trimmed && trimmed !== "0" ? trimmed : "";
}

/** 시/도 → 시/군/구 → 읍/면/동 → 리 순서로 이어 붙인다 */
function joinRegion(region: GcResult["region"]): string[] {
  return (["area1", "area2", "area3", "area4"] as const)
    .map((key) => clean(region?.[key]?.name))
    .filter(Boolean);
}

/** 본번-부번. land.type이 "2"면 산번지다 (1=일반토지, 2=산) */
function joinLotNumber(land: Land | undefined): string {
  const number1 = clean(land?.number1);
  if (!number1) return "";
  const prefix = clean(land?.type) === "2" ? "산 " : "";
  const number2 = clean(land?.number2);
  return number2 ? `${prefix}${number1}-${number2}` : `${prefix}${number1}`;
}

/**
 * 분해되어 오는 응답을 하나의 지번주소 문자열로 조립한다.
 * 예) 서울특별시 + 종로구 + 세종로 + (본번 1, 부번 68) → "서울특별시 종로구 세종로 1-68"
 * addr 결과가 없으면 legalcode(법정동)로 동까지만이라도 만들어 준다.
 */
function assembleAddress(results: GcResult[]): string | null {
  const addr = results.find((item) => item.name === "addr");
  const fallback = results.find((item) => item.name === "legalcode");
  const source = addr ?? fallback;
  if (!source) return null;

  const parts = joinRegion(source.region);
  const lotNumber = addr ? joinLotNumber(addr.land) : "";
  if (lotNumber) parts.push(lotNumber);

  const address = parts.join(" ").trim();
  return address || null;
}

/** 좌표 → 지번주소. 실패는 예외 대신 판별 가능한 결과로 돌려준다. */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult> {
  // 지도 REST API 키 쌍. Key ID는 보통 웹 지도용 Key ID와 같은 값이라 미설정 시 그쪽을 쓴다.
  const keyId = process.env.NAVER_MAP_API_KEY_ID || process.env.NEXT_PUBLIC_NAVER_MAP_KEY_ID;
  const key = process.env.NAVER_MAP_API_KEY;
  if (!keyId || !key) {
    return {
      ok: false,
      status: 500,
      error: "네이버 지도 REST API 키가 설정되지 않았습니다 (.env.example 참고)",
    };
  }

  // 쿼리를 직접 만든다 — URLSearchParams는 구분자 ','와 ':'까지 %2C/%3A로 인코딩하는데,
  // 문서의 요청 예시는 날것 그대로다. 둘 다 쿼리에서 유효한 문자이므로 예시와 같은 형태로 보낸다.
  // (lat/lng는 라우트에서 숫자로 검증된 값이라 주입 위험이 없다)
  // coords는 경도,위도 순서다 (위도,경도가 아니다)
  const url =
    `${ENDPOINT}?coords=${lng},${lat}` +
    `&sourcecrs=epsg:4326&orders=legalcode,addr&output=json`;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": keyId,
        "x-ncp-apigw-api-key": key,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: "네이버 지도 서버에 연결하지 못했습니다" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 502, error: "리버스 지오코딩 응답을 해석하지 못했습니다" };
  }

  if (!response.ok) {
    const error = (body as { error?: { errorCode?: string; details?: string } })?.error;
    console.error(`[reverse-geocode] ${response.status} ${error?.errorCode} ${error?.details ?? ""}`);
    // 210은 인증은 됐지만 해당 애플리케이션이 이 API를 구독하지 않은 경우 — 원인이 달라 따로 안내한다
    if (error?.errorCode === "210") {
      return {
        ok: false,
        status: 502,
        error: "이 키의 애플리케이션에 Reverse Geocoding API 이용 신청이 필요합니다",
      };
    }
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: 502, error: "네이버 지도 API 인증에 실패했습니다 — 키를 확인해주세요" };
    }
    return { ok: false, status: 502, error: "주소를 조회하지 못했습니다" };
  }

  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results)) return { ok: true, address: null };

  return { ok: true, address: assembleAddress(results as GcResult[]) };
}
