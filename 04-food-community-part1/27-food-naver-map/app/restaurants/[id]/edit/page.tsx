// 맛집 수정 — 등록과 같은 폼에 기존 값을 채워 BFF PATCH /api/places/[id] 로 저장한다.
import { notFound, redirect } from "next/navigation";
import { BackTopNav } from "@/components/app/back-top-nav";
import { PlaceForm } from "@/components/app/place-form";
import { getCurrentUser } from "@/lib/auth/dal";
import { toPlaceDto } from "@/lib/places/dto";
import { toSelectionFromStored } from "@/lib/places/place-search";
import { fetchPlace } from "@/lib/places/supabase";

export const metadata = { title: "맛집 수정 — 숨은맛집" };

export default async function RestaurantEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [user, row] = await Promise.all([getCurrentUser(), fetchPlace(id)]);
  if (!row) notFound();
  if (!user) redirect("/login");
  if (row.user_id !== user.id) redirect(`/restaurants/${id}`);

  const place = toPlaceDto(row, new Map());
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--bg-page)]">
      <BackTopNav title="맛집 수정" />
      <PlaceForm
        mode="edit"
        placeId={place.id}
        initialTitle={place.title}
        initialContent={place.content}
        initialImages={place.images}
        initialPlace={toSelectionFromStored(place)}
      />
    </div>
  );
}
