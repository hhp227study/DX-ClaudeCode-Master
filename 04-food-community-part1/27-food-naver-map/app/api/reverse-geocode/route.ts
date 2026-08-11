// 좌표 → 지번주소 프록시. 지역검색과 같은 이유로 시크릿을 서버에 가두고 로그인 사용자에게만 연다.
import { type NextRequest, NextResponse } from "next/server";
import { authenticateRoute, withSessionCookie } from "@/lib/auth/route-session";
import { reverseGeocode } from "@/lib/places/naver-reverse-geocode";

/** 좌표 문자열을 유효한 WGS84 값으로만 통과시킨다 */
function parseCoord(raw: string | null, limit: 90 | 180): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || Math.abs(value) > limit) return null;
  return value;
}

export async function GET(request: NextRequest) {
  const result = await authenticateRoute(request);
  if (!result.auth) return result.response;
  const { refreshed } = result.auth;

  const lat = parseCoord(request.nextUrl.searchParams.get("lat"), 90);
  const lng = parseCoord(request.nextUrl.searchParams.get("lng"), 180);
  if (lat === null || lng === null) {
    return withSessionCookie(
      NextResponse.json({ error: "좌표(lat, lng)가 올바르지 않습니다" }, { status: 400 }),
      refreshed,
    );
  }

  const geocoded = await reverseGeocode(lat, lng);
  const response = geocoded.ok
    ? NextResponse.json({ address: geocoded.address })
    : NextResponse.json({ error: geocoded.error }, { status: geocoded.status });
  return withSessionCookie(response, refreshed);
}
