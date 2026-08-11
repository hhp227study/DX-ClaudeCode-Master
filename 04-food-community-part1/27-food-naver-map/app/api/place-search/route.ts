// 네이버 지역검색 프록시 — Client Secret을 서버에 가두고, API 쿼터를 로그인 사용자에게만 연다.
// (브라우저에서 지역검색 API를 직접 부르면 CORS로 막히고 시크릿도 노출된다)
import { type NextRequest, NextResponse } from "next/server";
import { authenticateRoute, withSessionCookie } from "@/lib/auth/route-session";
import { searchLocalPlaces } from "@/lib/places/naver-local-search";
import { MIN_QUERY_LENGTH } from "@/lib/places/place-search";

export async function GET(request: NextRequest) {
  const result = await authenticateRoute(request);
  if (!result.auth) return result.response;
  const { refreshed } = result.auth;

  const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) {
    return withSessionCookie(NextResponse.json({ items: [] }), refreshed);
  }

  const search = await searchLocalPlaces(query);
  const response = search.ok
    ? NextResponse.json({ items: search.items })
    : NextResponse.json({ error: search.error }, { status: search.status });
  return withSessionCookie(response, refreshed);
}
