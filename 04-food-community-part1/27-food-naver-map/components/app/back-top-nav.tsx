"use client";
// 뒤로가기 상단바 — TopNavigation(SSOT)을 sticky + 콘텐츠 칼럼 폭으로 감싼 앱 셸
import { useRouter } from "next/navigation";
import { TopNavigation } from "../ui/top-navigation";

export type BackTopNavProps = {
  title: string;
  /** 내부 콘텐츠 칼럼 최대 폭 (px) */
  maxWidth?: number;
};

export function BackTopNav({ title, maxWidth = 720 }: BackTopNavProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto" style={{ maxWidth }}>
        <TopNavigation
          title={title}
          onLeft={() => router.back()}
          style={{ borderBottom: "none", background: "transparent" }}
        />
      </div>
    </header>
  );
}
