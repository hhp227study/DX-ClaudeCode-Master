// design.pen Components/TabNavigation 핸드오프.
// 균등폭 탭 + 2px 하단 인디케이터
import type { CSSProperties } from "react";

export type TabNavigationProps = {
  tabs: string[];
  activeIndex?: number;
  onSelect?: (index: number) => void;
  /** 컨테이너 폭을 탭이 균등 분배 (기본은 탭당 120px) */
  fullWidth?: boolean;
  style?: CSSProperties;
};

export function TabNavigation({
  tabs,
  activeIndex = 0,
  onSelect,
  fullWidth = false,
  style,
}: TabNavigationProps) {
  return (
    <div
      style={{
        display: "flex",
        height: 48,
        background: "var(--card)",
        borderBottom: "1px solid var(--border)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => onSelect?.(i)}
            aria-selected={active}
            role="tab"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: fullWidth ? undefined : 120,
              flex: fullWidth ? 1 : undefined,
              height: 48,
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: 46,
                fontFamily: "var(--font-body), sans-serif",
                fontSize: 14,
                fontWeight: 600,
                lineHeight: 1.4,
                letterSpacing: -0.28,
                color: active ? "var(--foreground)" : "var(--muted-foreground)",
              }}
            >
              {tab}
            </span>
            <span
              style={{
                width: "100%",
                height: 2,
                background: active ? "var(--primary)" : "transparent",
              }}
            />
          </button>
        );
      })}
    </div>
  );
}
