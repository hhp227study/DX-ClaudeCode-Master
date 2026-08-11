"use client";
// 하단 탭바 — BottomNavigation(SSOT)을 고정 배치 + 라우팅으로 감싼 앱 셸
import { useRouter } from "next/navigation";
import { BottomNavigation } from "../ui/bottom-navigation";

// 홈 / 검색 / 즐겨찾기 / MY — 검색·즐겨찾기는 이번 핸드오프 범위 밖이라 비활성
const TAB_ROUTES: (string | null)[] = ["/", null, null, "/my"];

export type AppBottomNavProps = {
  activeIndex?: 0 | 1 | 2 | 3;
};

export function AppBottomNav({ activeIndex = 0 }: AppBottomNavProps) {
  const router = useRouter();
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[var(--card)] pb-[env(safe-area-inset-bottom)]">
      <BottomNavigation
        activeIndex={activeIndex}
        onSelect={(i) => {
          const route = TAB_ROUTES[i];
          if (route) router.push(route);
        }}
        style={{ borderTop: "none", background: "transparent", maxWidth: 640, margin: "0 auto" }}
      />
    </div>
  );
}
