// design.pen 메인페이지 반응형 구현 — 모바일 1열 → sm 2열 → xl 3열 카드 그리드
// 맛집 목록은 BFF 데이터 계층(lib/places)으로 Supabase에서 조회한다.
import Link from "next/link";
import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { AppFab } from "@/components/app/app-fab";
import { AppHeader } from "@/components/app/app-header";
import { RestaurantCard } from "@/components/app/restaurant-card";
import { Empty } from "@/components/ui/empty";
import { Icon } from "@/components/ui/icon";
import { formatRelativeTime, toPlaceDto } from "@/lib/places/dto";
import { fetchNicknames, fetchPlaces } from "@/lib/places/supabase";

const CATEGORIES = [
  { emoji: "🍚", label: "한식" },
  { emoji: "☕", label: "카페" },
  { emoji: "🍝", label: "양식" },
  { emoji: "🅿️", label: "주차" },
  { emoji: "➕", label: "전체" },
];

function SearchBar() {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-[var(--bg-muted)] px-3.5 py-3">
      <Icon name="search" size={20} color="var(--text-tertiary)" />
      <span className="flex-1 text-[14px] text-[var(--text-tertiary)]">
        맛집 이름·지역으로 검색
      </span>
    </div>
  );
}

export default async function HomePage() {
  const rows = await fetchPlaces();
  const nicknames = await fetchNicknames(
    rows.map((r) => r.user_id).filter((v): v is string => !!v)
  );
  const places = rows.map((row) => toPlaceDto(row, nicknames));

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)] pb-[76px]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-4 px-4 pb-5 pt-2 md:px-6 lg:px-8">
        <div className="flex items-center gap-1">
          <Icon name="home" size={16} color="var(--pink-500)" />
          <span className="text-[14px] font-bold text-[var(--text-primary)]">구로구 개봉동</span>
          <Icon name="chevron-down" size={16} color="var(--text-secondary)" />
        </div>
        <SearchBar />
        <section className="flex items-center justify-between rounded-2xl bg-[linear-gradient(115deg,#FF3E7F,#FF7DA6)] p-5 md:px-8 md:py-7">
          <div className="flex flex-col gap-1.5">
            <span className="self-start rounded-md bg-white/20 px-2 py-[3px] text-[10px] font-semibold text-white">
              이번 주 추천
            </span>
            <strong className="whitespace-pre-line text-[18px] font-extrabold leading-[1.3] text-white md:text-[22px]">
              {"동네 이웃이 찾은\n숨은 맛집 12곳"}
            </strong>
            <span className="text-[12px] text-white/80 md:text-[13px]">주말 나들이 코스로 딱</span>
          </div>
          <span className="text-[52px] md:text-[72px]">🍜</span>
        </section>
        <section className="flex justify-between">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-brand-tint text-[22px]">
                {cat.emoji}
              </span>
              <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                {cat.label}
              </span>
            </div>
          ))}
        </section>
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between pt-1">
            <h2 className="m-0 text-[16px] font-bold text-[var(--text-primary)]">
              구로 주변 숨은 맛집
            </h2>
            <span className="flex items-center gap-0.5">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">최신순</span>
              <Icon name="chevron-down" size={16} color="var(--text-secondary)" />
            </span>
          </div>
          {places.length === 0 ? (
            <div className="flex flex-col items-center py-14">
              <Empty
                icon="image"
                title="아직 등록된 맛집이 없어요"
                description="오른쪽 아래 + 버튼으로 첫 맛집을 등록해보세요"
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {places.map((p) => (
                <Link
                  key={p.id}
                  href={`/restaurants/${p.id}`}
                  className="block text-inherit no-underline"
                >
                  <RestaurantCard
                    photoUrl={p.images[0]?.url}
                    tag="맛집"
                    name={p.title}
                    address={p.address}
                    meta={`${p.author} · ${formatRelativeTime(p.createdAt)}`}
                    style={{ height: "100%" }}
                  />
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
      <AppFab />
      <AppBottomNav activeIndex={0} />
    </div>
  );
}
