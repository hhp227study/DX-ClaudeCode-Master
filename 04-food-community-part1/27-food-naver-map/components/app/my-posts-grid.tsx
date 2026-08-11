"use client";
// 마이페이지 내가 쓴 글 그리드 — 카드 우상단 X로 소프트삭제(BFF DELETE) 후 목록 새로고침
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Empty } from "@/components/ui/empty";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { RestaurantCard } from "./restaurant-card";

export type MyPost = {
  id: string;
  photoUrl?: string;
  tag: string;
  name: string;
  address: string;
  meta: string;
};

export function MyPostsGrid({ posts }: { posts: MyPost[] }) {
  const router = useRouter();
  const [target, setTarget] = useState<MyPost | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (posts.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center py-14">
        <Empty
          icon="edit"
          title="아직 등록한 맛집이 없어요"
          description={"내가 아는 숨은 맛집을\n이웃에게 처음으로 소개해보세요!"}
          secondaryAction={{ label: "맛집 구경하기", onClick: () => router.push("/") }}
          primaryAction={{ label: "맛집 등록하기", onClick: () => router.push("/restaurants/new") }}
        />
      </div>
    );
  }

  const closeModal = () => {
    if (pending) return;
    setTarget(null);
    setError(null);
  };

  const softDelete = async () => {
    if (!target || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/places/${target.id}`, { method: "DELETE" });
      if (res.status === 401) {
        window.location.assign("/login");
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error ?? "맛집 삭제에 실패했습니다");
        return;
      }
      setTarget(null);
      router.refresh();
    } catch {
      setError("맛집 삭제에 실패했습니다");
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {posts.map((post) => (
          <div key={post.id} className="relative">
            <Link href={`/restaurants/${post.id}`} className="block h-full text-inherit no-underline">
              <RestaurantCard
                photoUrl={post.photoUrl}
                tag={post.tag}
                name={post.name}
                address={post.address}
                meta={post.meta}
                style={{ height: "100%" }}
              />
            </Link>
            <IconButton
              variant="ghost"
              icon="close"
              iconColor="var(--text-tertiary)"
              onClick={() => setTarget(post)}
              style={{ position: "absolute", top: 4, right: 4, width: 36, height: 36 }}
            />
          </div>
        ))}
      </div>

      {target && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-[var(--black)] opacity-40" onClick={closeModal} />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
            <div className="pointer-events-auto">
              <Modal
                title="글 삭제"
                destructive
                confirmLabel={pending ? "삭제 중..." : "삭제"}
                onCancel={closeModal}
                onClose={closeModal}
                onConfirm={softDelete}
              >
                <span style={{ whiteSpace: "pre-line" }}>
                  {`'${target.name}' 글을 삭제할까요?\n삭제한 글은 목록에서 더 이상 보이지 않아요.`}
                </span>
                {error && (
                  <div style={{ marginTop: 8, color: "var(--destructive)", fontSize: 13 }}>{error}</div>
                )}
              </Modal>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
