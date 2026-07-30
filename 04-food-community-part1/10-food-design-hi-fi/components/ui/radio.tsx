// design.pen Components/Radio 핸드오프.
// Unselected/Selected × Default/Disabled × md(20)/sm(16)
import type { CSSProperties } from "react";

export type RadioSize = "md" | "sm";

const SIZE: Record<RadioSize, { circle: number; dot: number }> = {
  md: { circle: 20, dot: 10 },
  sm: { circle: 16, dot: 8 },
};

export type RadioProps = {
  selected?: boolean;
  disabled?: boolean;
  size?: RadioSize;
  label: string;
  style?: CSSProperties;
};

export function Radio({
  selected = false,
  disabled = false,
  size = "md",
  label,
  style,
}: RadioProps) {
  const s = SIZE[size];
  const border = disabled
    ? "1.5px solid var(--border)"
    : selected
      ? "1.5px solid var(--primary)"
      : "1.5px solid var(--input)";
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
          justifyContent: "center",
          width: s.circle,
          height: s.circle,
          borderRadius: "var(--radius-pill)",
          background: disabled ? "var(--muted)" : "var(--card)",
          border,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {selected && (
          <span
            style={{
              width: s.dot,
              height: s.dot,
              borderRadius: "var(--radius-pill)",
              background: disabled ? "var(--muted-foreground)" : "var(--primary)",
            }}
          />
        )}
      </span>
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
    </div>
  );
}
