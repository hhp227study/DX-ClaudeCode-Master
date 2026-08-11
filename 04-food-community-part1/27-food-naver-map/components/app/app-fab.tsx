"use client";
// 맛집 등록 플로팅 버튼 — 1280px 컨테이너 우측 가장자리에 정렬
import { useRouter } from "next/navigation";
import { IconButton } from "../ui/icon-button";

export function AppFab() {
  const router = useRouter();
  return (
    <IconButton
      variant="brand"
      icon="plus"
      onClick={() => router.push("/restaurants/new")}
      style={{
        position: "fixed",
        right: "max(16px, calc((100vw - 1280px) / 2 + 16px))",
        bottom: 88,
        zIndex: 40,
        width: 56,
        height: 56,
        background: "var(--pink-500)",
        boxShadow: "0 6px 16px #FF3E7F55",
      }}
    />
  );
}
