// 메인 페이지 상단 헤더 — design.pen 메인페이지 로고 행의 반응형 구현
import Link from "next/link";
import { IconButton } from "../ui/icon-button";

export function AppHeader() {
  return (
    <header className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-4 py-1 md:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-0.5 no-underline">
        <span className="text-[20px] text-brand">🍽</span>
        <span className="typo-logo text-[var(--text-primary)]">숨은맛집</span>
      </Link>
      <div className="flex items-center gap-2">
        <IconButton variant="ghost" icon="notification" iconColor="var(--text-primary)" />
        <span aria-label="내 프로필" className="h-7 w-7 rounded-full bg-brand-soft" />
      </div>
    </header>
  );
}
