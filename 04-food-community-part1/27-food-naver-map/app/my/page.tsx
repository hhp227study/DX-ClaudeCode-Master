// design.pen 마이페이지 반응형 구현 — 내가 쓴 글 카드 그리드 확장
// 내가 쓴 글은 BFF 데이터 계층(lib/places)으로 Supabase에서 조회하고, X 아이콘으로 소프트삭제한다.
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppBottomNav } from "@/components/app/app-bottom-nav";
import { LogoutButton } from "@/components/app/logout-button";
import { type MyPost, MyPostsGrid } from "@/components/app/my-posts-grid";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { getCurrentUser } from "@/lib/auth/dal";
import { formatRelativeTime, toPlaceDto } from "@/lib/places/dto";
import { fetchPlacesByUser } from "@/lib/places/supabase";

export const metadata = { title: "마이페이지 — 숨은맛집" };

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-[3px]">
      <span className="text-[20px] font-extrabold text-[var(--text-primary)]">{num}</span>
      <span className="text-[11px] font-medium text-[var(--text-secondary)]">{label}</span>
    </div>
  );
}

function StatDivider() {
  return <span className="h-8 w-px bg-[var(--border-strong)]" />;
}

export default async function MyPage() {
  // proxy가 낙관적 차단을 하지만, 데이터 접근 직전의 검증은 DAL이 담당한다
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await fetchPlacesByUser(user.id);
  const nicknames = new Map([[user.id, user.nickname]]);
  const posts: MyPost[] = rows.map((row) => {
    const place = toPlaceDto(row, nicknames);
    return {
      id: place.id,
      photoUrl: place.images[0]?.url,
      tag: "맛집",
      name: place.title,
      address: place.address,
      meta: formatRelativeTime(place.createdAt),
    };
  });

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)] pb-[76px]">
      <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between py-1 pl-4 pr-1 md:px-6 lg:px-8">
        <h1 className="m-0 text-[20px] font-extrabold text-[var(--text-primary)]">마이페이지</h1>
        <IconButton variant="ghost" icon="settings" iconColor="var(--text-secondary)" />
      </header>
      <main className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col gap-5 px-4 pb-5 pt-2 md:px-6 lg:px-8">
        <section className="flex items-center gap-3.5">
          {user.imagePath ? (
            // 구글 프로필 이미지 — referrer 없이 요청해야 403이 나지 않는다
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.imagePath}
              alt=""
              referrerPolicy="no-referrer"
              className="h-[60px] w-[60px] shrink-0 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-full bg-brand-soft text-[24px] font-bold text-brand-strong">
              {user.nickname.slice(0, 1)}
            </span>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <span className="text-[17px] font-extrabold text-[var(--text-primary)]">
              {user.nickname}
            </span>
            <span className="truncate text-[12px] text-[var(--text-tertiary)]">
              {user.email ?? "구로구 개봉동 · 이웃 맛집러"}
            </span>
          </div>
          <Link href="/my/profile" className="shrink-0 no-underline">
            <Button variant="secondary" leadIcon="edit">
              프로필 수정
            </Button>
          </Link>
        </section>

        <section className="flex items-center rounded-[14px] bg-[var(--bg-muted)] py-4">
          <Stat num={String(posts.length)} label="내가 쓴 글" />
          <StatDivider />
          <Stat num="0" label="저장한 곳" />
          <StatDivider />
          <Stat num="0" label="받은 좋아요" />
        </section>

        <div className="flex items-center gap-1.5 pt-1">
          <h2 className="m-0 text-[16px] font-bold text-[var(--text-primary)]">내가 쓴 글</h2>
          <span className="text-[16px] font-bold text-brand">{posts.length}</span>
        </div>

        <MyPostsGrid posts={posts} />

        <div className="w-full sm:mx-auto sm:max-w-[360px]">
          <LogoutButton />
        </div>
      </main>
      <AppBottomNav activeIndex={3} />
    </div>
  );
}
