"use client";
// design.pen 로그인페이지 반응형 구현 — 브랜드 블록 중앙, CTA는 420px 칼럼
// 로그인 실패(?error=1) 시 로그인페이지-에러 핸드오프의 Toast 노출
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Toast } from "@/components/ui/toast";

function LoginContent() {
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const hasError = searchParams.has("error");

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)]">
      {hasError && (
        <div className="mx-auto w-full max-w-[420px] px-4 pt-2">
          <Toast
            status="error"
            fullWidth
            message="로그인에 실패했어요. 잠시 후 다시 시도해주세요."
          />
        </div>
      )}
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-8">
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-brand-tint text-[40px]">
          🍽
        </span>
        <h1 className="typo-display m-0 font-normal text-[var(--text-primary)]">숨은맛집</h1>
        <p className="m-0 whitespace-pre-line text-center text-[14px] leading-[1.5] text-[var(--text-secondary)]">
          {"우리 동네 이웃이 알려주는\n진짜 숨은 맛집 커뮤니티"}
        </p>
      </main>
      <div className="mx-auto flex w-full max-w-[420px] flex-col gap-3 px-5 pb-8 pt-2">
        <Button
          variant="secondary"
          fullWidth
          leadIcon="user"
          loading={redirecting}
          onClick={() => {
            setRedirecting(true);
            // OAuth는 전체 페이지 이동이 필요 — BFF 진입점으로 보낸다
            window.location.assign("/api/auth/login");
          }}
          style={{
            height: 48,
            background: "var(--white)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
          }}
        >
          Google 계정으로 계속하기
        </Button>
        <p className="m-0 text-center text-[11px] text-[var(--text-tertiary)]">
          로그인하면 이용약관과 개인정보 처리방침에 동의하게 돼요
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
