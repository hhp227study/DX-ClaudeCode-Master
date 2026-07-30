// design.pen Components/BottomNavigation 핸드오프.
// 고정 4탭(홈/검색/즐겨찾기/MY), 변형: default / icon-only
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

const TABS: { label: string; icon: DsIconName }[] = [
  { label: "홈", icon: "home" },
  { label: "검색", icon: "search" },
  { label: "즐겨찾기", icon: "bookmark" },
  { label: "MY", icon: "user" },
];

export type BottomNavigationProps = {
  activeIndex?: 0 | 1 | 2 | 3;
  /** 라벨 없이 아이콘만 표시 */
  iconOnly?: boolean;
  onSelect?: (index: number) => void;
  style?: CSSProperties;
};

export function BottomNavigation({
  activeIndex = 0,
  iconOnly = false,
  onSelect,
  style,
}: BottomNavigationProps) {
  return (
    <nav
      style={{
        display: "flex",
        alignItems: "center",
        width: "100%",
        height: 56,
        background: "var(--card)",
        borderTop: "1px solid var(--border)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {TABS.map((tab, i) => {
        const active = i === activeIndex;
        const color = active ? "var(--primary)" : "var(--muted-foreground)";
        return (
          <button
            key={tab.label}
            type="button"
            onClick={() => onSelect?.(i)}
            aria-current={active ? "page" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
              height: "100%",
              background: "none",
              border: "none",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <Icon name={tab.icon} size={24} color={color} />
            {!iconOnly && (
              <span
                style={{
                  fontFamily: "var(--font-body), sans-serif",
                  fontSize: 12,
                  lineHeight: 1.4,
                  letterSpacing: -0.24,
                  color,
                }}
              >
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
