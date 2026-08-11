// 네이버 지역검색(NAVER API Hub — Search Local) 서버 전용 클라이언트.
// 브라우저에서 직접 부를 수 없다 — Client Secret이 노출되고 CORS로도 막히므로 BFF 라우트에서만 호출한다.
// 문서: https://api.ncloud-docs.com/docs/naver-api-hub-search-local
import { LOCAL_SEARCH_MAX_RESULTS, type LocalPlace } from "./place-search";

const ENDPOINT = "https://naverapihub.apigw.ntruss.com/search/v1/local";

export type LocalSearchResult =
  | { ok: true; items: LocalPlace[] }
  | { ok: false; status: number; error: string };

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** 업체명에는 검색어 강조 <b> 태그와 HTML 엔티티가 섞여 온다 */
function stripHtml(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/&(?:amp|lt|gt|quot|#39|apos|nbsp);/g, (entity) => HTML_ENTITIES[entity] ?? entity)
    .trim();
}

/**
 * mapx(경도)·mapy(위도)를 WGS84 실수로 바꾼다.
 * 문서에는 "WGS84 좌표계 기준"이라고만 적혀 있지만 실제 응답은 도(degree)에 10^7을 곱한
 * 정수 문자열("1270276620")로 온다. 두 형태를 모두 받도록 크기를 보고 나눈다.
 * 변환 후에도 유효 범위를 벗어나면 좌표 없음(null)으로 두어 호출부가 기본 좌표를 쓰게 한다.
 */
function parseCoord(raw: unknown, limit: 90 | 180): number | null {
  if (typeof raw !== "string" && typeof raw !== "number") return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const degrees = Math.abs(value) > limit ? value / 1e7 : value;
  return Math.abs(degrees) <= limit ? degrees : null;
}

function toLocalPlace(raw: unknown, index: number): LocalPlace | null {
  if (typeof raw !== "object" || raw === null) return null;
  const item = raw as Record<string, unknown>;
  const name = stripHtml(item.title);
  if (!name) return null;

  const lat = parseCoord(item.mapy, 90);
  const lng = parseCoord(item.mapx, 180);

  return {
    id: `${lat ?? "x"},${lng ?? "y"}-${name}-${index}`,
    name,
    category: stripHtml(item.category),
    address: stripHtml(item.address),
    roadAddress: stripHtml(item.roadAddress),
    lat,
    lng,
  };
}

/** 지역검색 호출 — 실패는 예외 대신 판별 가능한 결과로 돌려준다 */
export async function searchLocalPlaces(query: string): Promise<LocalSearchResult> {
  const clientId = process.env.NAVER_SEARCH_CLIENT_ID;
  const clientSecret = process.env.NAVER_SEARCH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return {
      ok: false,
      status: 500,
      error: "네이버 지역검색 키가 설정되지 않았습니다 (.env.example 참고)",
    };
  }

  const url = new URL(ENDPOINT);
  url.searchParams.set("query", query);
  url.searchParams.set("display", String(LOCAL_SEARCH_MAX_RESULTS));
  url.searchParams.set("start", "1");
  url.searchParams.set("sort", "random"); // 정확도순 (문서 기본값)
  url.searchParams.set("format", "json");

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-NCP-APIGW-API-KEY-ID": clientId,
        "X-NCP-APIGW-API-KEY": clientSecret,
      },
      cache: "no-store",
    });
  } catch {
    return { ok: false, status: 502, error: "네이버 지역검색 서버에 연결하지 못했습니다" };
  }

  if (!response.ok) {
    // 401/403은 키 문제, SE0x 코드는 요청 문제 — 원문은 서버 로그로만 남기고 사용자에겐 요약을 준다
    const detail = await response.text().catch(() => "");
    console.error(`[local-search] ${response.status} ${detail.slice(0, 300)}`);
    if (response.status === 401 || response.status === 403) {
      return { ok: false, status: 502, error: "네이버 지역검색 인증에 실패했습니다 — 키를 확인해주세요" };
    }
    return { ok: false, status: 502, error: "네이버 지역검색에 실패했습니다" };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return { ok: false, status: 502, error: "네이버 지역검색 응답을 해석하지 못했습니다" };
  }

  const rawItems = (body as { items?: unknown })?.items;
  if (!Array.isArray(rawItems)) return { ok: true, items: [] };

  return {
    ok: true,
    items: rawItems.map(toLocalPlace).filter((item): item is LocalPlace => item !== null),
  };
}
