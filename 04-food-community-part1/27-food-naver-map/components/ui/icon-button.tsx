// design.pen Components/IconButton 핸드오프.
// 변형: Ghost / CircleBrand / CircleNeutral (48×48)
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type IconButtonVariant = "ghost" | "brand" | "neutral";

const VARIANT: Record<IconButtonVariant, { bg?: string; fg: string; pill: boolean }> = {
  ghost: { fg: "var(--foreground)", pill: false },
  brand: { bg: "var(--primary)", fg: "var(--primary-foreground)", pill: true },
  neutral: { bg: "var(--secondary)", fg: "var(--secondary-foreground)", pill: true },
};

export type IconButtonProps = {
  variant?: IconButtonVariant;
  icon: DsIconName;
  /** 아이콘 색 오버라이드 (주로 ghost에서 사용) */
  iconColor?: string;
  onClick?: () => void;
  style?: CSSProperties;
};

export function IconButton({
  variant = "ghost",
  icon,
  iconColor,
  onClick,
  style,
}: IconButtonProps) {
  const v = VARIANT[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={icon}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 48,
        height: 48,
        background: v.bg ?? "transparent",
        border: "none",
        borderRadius: v.pill ? "var(--radius-pill)" : 0,
        cursor: "pointer",
        padding: 0,
        ...style,
      }}
    >
      <Icon name={icon} size={24} color={iconColor ?? v.fg} />
    </button>
  );
}
