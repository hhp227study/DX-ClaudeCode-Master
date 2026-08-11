// design.pen 등록페이지 반응형 구현 — 720px 폼 칼럼 + sticky 하단 제출바
// 저장은 BFF POST /api/places — 주소는 '등록 대기중'으로 자동 저장된다.
import { redirect } from "next/navigation";
import { BackTopNav } from "@/components/app/back-top-nav";
import { PlaceForm } from "@/components/app/place-form";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata = { title: "맛집 등록 — 숨은맛집" };

export default async function RestaurantRegisterPage() {
  // proxy가 낙관적 차단을 하지만, 데이터 접근 직전의 검증은 DAL이 담당한다
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)]">
      <BackTopNav title="맛집 등록" />
      <PlaceForm mode="create" />
    </div>
  );
}
