// design.pen 상세페이지 반응형 구현 — 모바일 풀블리드 사진 → md 720px 읽기 칼럼
// 맛집 상세는 BFF 데이터 계층(lib/places)으로 Supabase에서 조회한다.
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackTopNav } from "@/components/app/back-top-nav";
import { PhotoCarousel } from "@/components/app/photo-carousel";
import { PlaceMiniMap } from "@/components/app/place-mini-map";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatPostedDate, toPlaceDto } from "@/lib/places/dto";
import { fetchNicknames, fetchPlace } from "@/lib/places/supabase";

export const metadata = { title: "맛집 상세 — 숨은맛집" };

function Divider() {
  return <hr className="m-0 h-px border-0 bg-[var(--border-subtle)]" />;
}

export default async function RestaurantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await fetchPlace(id);
  if (!row) notFound();

  const [nicknames, user] = await Promise.all([
    fetchNicknames(row.user_id ? [row.user_id] : []),
    getCurrentUser(),
  ]);
  const place = toPlaceDto(row, nicknames);
  const isAuthor = !!user && !!place.userId && user.id === place.userId;

  return (
    <div className="min-h-dvh bg-[var(--bg-page)]">
      <BackTopNav title="맛집 상세" />
      <main className="mx-auto w-full max-w-[720px] px-4 pb-12 md:px-6">
        <PhotoCarousel urls={place.images.map((img) => img.url)} alt={place.title} />
        <div className="flex flex-col gap-4 pb-2 pt-4">
          <div className="flex flex-col items-start gap-2">
            <Badge variant="neutral">맛집</Badge>
            <h1 className="typo-title-1 m-0 text-[var(--text-primary)]">{place.title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-8 w-8 shrink-0 rounded-full bg-brand-soft" />
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                {place.author}
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {formatPostedDate(place.createdAt)}
              </span>
            </div>
            {isAuthor ? (
              <Link href={`/restaurants/${place.id}/edit`} className="no-underline">
                <Button variant="secondary" leadIcon="edit">
                  수정
                </Button>
              </Link>
            ) : (
              <Button variant="secondary" leadIcon="bookmark">
                저장
              </Button>
            )}
          </div>
          <Divider />
          <p className="m-0 whitespace-pre-line text-[14px] leading-[1.7] text-[var(--text-primary)] md:text-[15px]">
            {place.content}
          </p>
          <Divider />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Icon name="home" size={16} color="var(--pink-500)" />
              <div className="flex min-w-0 flex-1 flex-col">
                {place.name && (
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {place.name}
                  </span>
                )}
                <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                  {place.address}
                </span>
              </div>
            </div>
            {place.lat !== null && place.lng !== null ? (
              <PlaceMiniMap lat={place.lat} lng={place.lng} name={place.name} />
            ) : (
              // 지도 정보 필수화 이전에 등록된 글은 좌표가 없다
              <div className="flex h-[160px] flex-col items-center justify-center gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] md:h-[220px]">
                <Icon name="image" size={24} color="var(--text-tertiary)" />
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  위치 정보가 없는 맛집이에요
                </span>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
