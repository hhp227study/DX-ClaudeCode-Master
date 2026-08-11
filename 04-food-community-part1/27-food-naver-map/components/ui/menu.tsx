// design.pen Components/Menu + MenuItem 핸드오프.
// MenuItem: Default/Destructive × Default/Disabled × lg(48)/md(40)/sm(32).
import type { CSSProperties, ReactNode } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type MenuProps = {
  children: ReactNode;
  width?: number | string;
  style?: CSSProperties;
};

export function Menu({ children, width, style }: MenuProps) {
  return (
    <div
      role="menu"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        width,
        padding: 6,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export type MenuItemSize = "lg" | "md" | "sm";

const ITEM_SIZE: Record<
  MenuItemSize,
  { height: number; paddingX: number; gap: number; iconSize: 16 | 20 }
> = {
  lg: { height: 48, paddingX: 16, gap: 8, iconSize: 20 },
  md: { height: 40, paddingX: 14, gap: 8, iconSize: 20 },
  sm: { height: 32, paddingX: 12, gap: 6, iconSize: 16 },
};

export type MenuItemProps = {
  children: ReactNode;
  icon?: DsIconName;
  destructive?: boolean;
  disabled?: boolean;
  size?: MenuItemSize;
  onClick?: () => void;
  style?: CSSProperties;
};

export function MenuItem({
  children,
  icon,
  destructive = false,
  disabled = false,
  size = "md",
  onClick,
  style,
}: MenuItemProps) {
  const s = ITEM_SIZE[size];
  const iconName = icon ?? (destructive ? "delete" : "edit");
  const iconColor = disabled
    ? "var(--muted-foreground)"
    : destructive
      ? "var(--destructive)"
      : "var(--muted-foreground)";
  const labelColor = disabled
    ? "var(--muted-foreground)"
    : destructive
      ? "var(--destructive)"
      : "var(--foreground)";
  return (
    <div
      role="menuitem"
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: s.gap,
        height: s.height,
        padding: `0 ${s.paddingX}px`,
        borderRadius: 8,
        cursor: disabled ? "default" : "pointer",
        fontFamily: "var(--font-body), sans-serif",
        fontSize: 16,
        lineHeight: 1.4,
        letterSpacing: -0.32,
        color: labelColor,
        ...style,
      }}
    >
      <Icon name={iconName} size={s.iconSize} color={iconColor} />
      {children}
    </div>
  );
}
