// design.pen Components/Checkbox 핸드오프.
// Unchecked/Checked/Indeterminate × Default/Disabled/Error × md(20)/sm(16)
import type { CSSProperties } from "react";
import { Icon } from "./icon";

export type CheckboxState = "default" | "disabled" | "error";
export type CheckboxSize = "md" | "sm";

const SIZE: Record<
  CheckboxSize,
  { box: number; radius: number; check: number; bar: { w: number; h: number }; checkStroke: number }
> = {
  md: { box: 20, radius: 6, check: 14, bar: { w: 10, h: 2 }, checkStroke: 3 },
  sm: { box: 16, radius: 4, check: 12, bar: { w: 8, h: 2 }, checkStroke: 3 },
};

export type CheckboxProps = {
  checked?: boolean;
  /** true면 checked보다 우선한다 */
  indeterminate?: boolean;
  state?: CheckboxState;
  size?: CheckboxSize;
  label: string;
  style?: CSSProperties;
};

export function Checkbox({
  checked = false,
  indeterminate = false,
  state = "default",
  size = "md",
  label,
  style,
}: CheckboxProps) {
  const s = SIZE[size];
  const disabled = state === "disabled";
  const filled = checked || indeterminate;

  const boxBg = filled
    ? disabled
      ? "var(--muted)"
      : state === "error"
        ? "var(--destructive)"
        : "var(--primary)"
    : disabled
      ? "var(--muted)"
      : "var(--card)";
  const boxBorder = filled
    ? "none"
    : state === "error"
      ? "1.5px solid var(--destructive)"
      : disabled
        ? "1.5px solid var(--border)"
        : "1.5px solid var(--input)";
  const markColor = disabled
    ? "var(--muted-foreground)"
    : state === "error"
      ? "var(--white)"
      : "var(--primary-foreground)";

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
          width: s.box,
          height: s.box,
          borderRadius: s.radius,
          background: boxBg,
          border: boxBorder,
          boxSizing: "border-box",
          flexShrink: 0,
        }}
      >
        {indeterminate ? (
          <span style={{ width: s.bar.w, height: s.bar.h, background: markColor }} />
        ) : checked ? (
          <Icon name="check" size={s.check} color={markColor} strokeWidth={s.checkStroke} />
        ) : null}
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
