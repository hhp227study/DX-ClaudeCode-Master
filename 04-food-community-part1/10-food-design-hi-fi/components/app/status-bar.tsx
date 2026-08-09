// design.pen component/StatusBar 핸드오프 — 페이지 상단 상태바 (목업용)
import type { CSSProperties } from "react";
import { Icon } from "../ui/icon";

export type StatusBarProps = {
  time?: string;
  style?: CSSProperties;
};

export function StatusBar({ time = "11:51", style }: StatusBarProps) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        height: 54,
        padding: "0 20px",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        ...style,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 15,
          fontWeight: 600,
        }}
      >
        {time}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="menu" size={16} />
        <Icon name="share" size={16} />
        <Icon name="image" size={20} />
      </span>
    </div>
  );
}
