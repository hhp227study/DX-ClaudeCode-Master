// design.pen Components/Badge 핸드오프. Neutral/Success/Error/Info/Warning × md(20)/lg(24).
import type { CSSProperties, ReactNode } from "react";

export type BadgeVariant = "neutral" | "success" | "error" | "info" | "warning";
export type BadgeSize = "md" | "lg";

const VARIANT: Record<BadgeVariant, { bg: string; fg: string }> = {
  neutral: { bg: "var(--secondary)", fg: "var(--secondary-foreground)" },
  success: { bg: "var(--color-success-foreground)", fg: "var(--white)" },
  error: { bg: "var(--destructive)", fg: "var(--white)" },
  info: { bg: "var(--color-info-foreground)", fg: "var(--white)" },
  warning: { bg: "var(--color-warning-foreground)", fg: "var(--white)" },
};

const HEIGHT: Record<BadgeSize, number> = { md: 20, lg: 24 };

export type BadgeProps = {
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: CSSProperties;
  children: ReactNode;
};

export function Badge({ variant = "neutral", size = "md", style, children }: BadgeProps) {
  const v = VARIANT[variant];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        height: HEIGHT[size],
        padding: "0 8px",
        borderRadius: "var(--radius-pill)",
        background: v.bg,
        color: v.fg,
        fontFamily: "var(--font-body), sans-serif",
        fontSize: 12,
        lineHeight: 1.4,
        letterSpacing: -0.24,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
