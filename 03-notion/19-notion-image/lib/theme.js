"use client";

import { useEffect, useState } from "react";
import { THEME_KEY } from "@/lib/theme-script";

export { THEME_KEY };

export function isValidTheme(value) {
  return value === "light" || value === "dark";
}

export function applyTheme(theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

export function useTheme() {
  // SSR/첫 렌더는 light로 두고, 마운트 후 <html data-theme>에서 실제 값을 동기화
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const current = document.documentElement.dataset.theme;
    if (isValidTheme(current)) setTheme(current);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // 저장소 접근 불가(시크릿 모드 등) — 세션 내에서만 유지
    }
  };

  return { theme, toggle };
}
