// 프로필 수정 — 닉네임·이미지 변경, 저장은 BFF PATCH /api/profile
import { redirect } from "next/navigation";
import { BackTopNav } from "@/components/app/back-top-nav";
import { ProfileEditForm } from "@/components/app/profile-edit-form";
import { getCurrentUser } from "@/lib/auth/dal";

export const metadata = { title: "프로필 수정 — 숨은맛집" };

export default async function ProfileEditPage() {
  // proxy가 낙관적 차단을 하지만, 데이터 접근 직전의 검증은 DAL이 담당한다
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)]">
      <BackTopNav title="프로필 수정" />
      <ProfileEditForm initialNickname={user.nickname} initialImageUrl={user.imagePath} />
    </div>
  );
}
