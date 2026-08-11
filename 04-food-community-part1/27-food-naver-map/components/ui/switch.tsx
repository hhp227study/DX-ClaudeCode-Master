// design.pen Components/Switch 핸드오프.
// Off/On × Default/Disabled × md(40×20)/sm(32×16)
import type { CSSProperties } from "react";

export type SwitchSize = "md" | "sm";

const SIZE: Record<SwitchSize, { trackW: number; trackH: number; thumb: number }> = {
  md: { trackW: 40, trackH: 20, thumb: 16 },
  sm: { trackW: 32, trackH: 16, thumb: 12 },
};

export type SwitchProps = {
  on?: boolean;
  disabled?: boolean;
  size?: SwitchSize;
  label?: string;
  style?: CSSProperties;
};

export function Switch({
  on = false,
  disabled = false,
  size = "md",
  label,
  style,
}: SwitchProps) {
  const s = SIZE[size];
  const trackBg = disabled ? "var(--muted)" : on ? "var(--primary)" : "var(--input)";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: on ? "flex-end" : "flex-start",
          width: s.trackW,
          height: s.trackH,
          padding: 2,
          borderRadius: "var(--radius-pill)",
          background: trackBg,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: s.thumb,
            height: s.thumb,
            borderRadius: "var(--radius-pill)",
            background: "var(--white)",
          }}
        />
      </span>
      {label && (
        <span
          style={{
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: -0.28,
            color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
