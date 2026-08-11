"use client";
// 마이페이지 로그아웃 — BFF 로그아웃 엔드포인트 호출 후 로그인 페이지로 이동
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="secondary"
      leadIcon="logout"
      fullWidth
      loading={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/auth/logout", { method: "POST" });
        window.location.assign("/login");
      }}
    >
      로그아웃
    </Button>
  );
}
