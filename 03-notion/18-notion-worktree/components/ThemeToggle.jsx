"use client";

import { useTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <button
      type="button"
      className="nav theme-toggle"
      aria-pressed={dark}
      onClick={toggle}
    >
      <span className="ic">{dark ? "☀️" : "🌙"}</span>
      <span className="label">{dark ? "라이트 모드" : "다크 모드"}</span>
    </button>
  );
}
