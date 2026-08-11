// design.pen Components/Button 핸드오프.
// 변형: Primary/Secondary/Destructive × lg/md/sm × Default/Disabled/Loading
import type { CSSProperties, ReactNode } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "destructive";
export type ButtonSize = "lg" | "md" | "sm";

const SIZE: Record<
  ButtonSize,
  { height: number; paddingX: number; gap: number; radius: number; iconSize: 16 | 20 }
> = {
  lg: { height: 48, paddingX: 20, gap: 8, radius: 12, iconSize: 20 },
  md: { height: 40, paddingX: 16, gap: 8, radius: 10, iconSize: 20 },
  sm: { height: 32, paddingX: 12, gap: 6, radius: 8, iconSize: 16 },
};

const VARIANT: Record<ButtonVariant, { bg: string; fg: string }> = {
  primary: { bg: "var(--primary)", fg: "var(--primary-foreground)" },
  secondary: { bg: "var(--secondary)", fg: "var(--secondary-foreground)" },
  destructive: { bg: "var(--destructive)", fg: "var(--white)" },
};

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  /** 스피너 아이콘으로 교체되고 클릭이 막힌다 */
  loading?: boolean;
  leadIcon?: DsIconName;
  fullWidth?: boolean;
  onClick?: () => void;
  style?: CSSProperties;
  children: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  leadIcon,
  fullWidth = false,
  onClick,
  style,
  children,
}: ButtonProps) {
  const s = SIZE[size];
  const v = VARIANT[variant];
  const bg = disabled ? "var(--muted)" : v.bg;
  const fg = disabled ? "var(--muted-foreground)" : v.fg;
  return (
    <button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: s.height,
        padding: `0 ${s.paddingX}px`,
        gap: s.gap,
        borderRadius: s.radius,
        background: bg,
        color: fg,
        border: "none",
        cursor: disabled || loading ? "default" : "pointer",
        fontFamily: "var(--font-body), sans-serif",
        fontSize: 14,
        fontWeight: 600,
        lineHeight: 1.4,
        letterSpacing: -0.28,
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
    >
      {loading ? (
        <Icon name="refresh" size={s.iconSize} color={fg} className="ds-spin" />
      ) : leadIcon ? (
        <Icon name={leadIcon} size={s.iconSize} color={fg} />
      ) : null}
      {children}
    </button>
  );
}
