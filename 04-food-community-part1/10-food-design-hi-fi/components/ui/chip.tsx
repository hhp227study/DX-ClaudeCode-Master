// design.pen Components/Chip 핸드오프.
// Unselected/Selected × Default/Disabled × md(32)/sm(24), 좌측 아이콘 옵션
import type { CSSProperties, ReactNode } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type ChipSize = "md" | "sm";

const SIZE: Record<ChipSize, { height: number; paddingX: number; paddingLeftIcon: number }> = {
  md: { height: 32, paddingX: 16, paddingLeftIcon: 8 },
  sm: { height: 24, paddingX: 12, paddingLeftIcon: 6 },
};

export type ChipProps = {
  selected?: boolean;
  disabled?: boolean;
  size?: ChipSize;
  leadIcon?: DsIconName;
  style?: CSSProperties;
  children: ReactNode;
};

export function Chip({
  selected = false,
  disabled = false,
  size = "md",
  leadIcon,
  style,
  children,
}: ChipProps) {
  const s = SIZE[size];
  const bg = disabled ? "var(--muted)" : selected ? "var(--primary)" : "var(--muted)";
  const fg = disabled
    ? "var(--muted-foreground)"
    : selected
      ? "var(--primary-foreground)"
      : "var(--foreground)";
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        height: s.height,
        paddingRight: s.paddingX,
        paddingLeft: leadIcon ? s.paddingLeftIcon : s.paddingX,
        borderRadius: "var(--radius-pill)",
        background: bg,
        color: fg,
        fontFamily: "var(--font-body), sans-serif",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: -0.28,
        ...style,
      }}
    >
      {leadIcon && <Icon name={leadIcon} size={16} color={fg} />}
      {children}
    </span>
  );
}
