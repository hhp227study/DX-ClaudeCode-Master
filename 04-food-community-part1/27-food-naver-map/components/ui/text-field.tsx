// design.pen Components/TextField 핸드오프.
// 타입: Text/Password × 상태: Default/Focused/Disabled/Error × 사이즈: lg(48)/md(40)/sm(32)
// 실제 <input>을 렌더한다 — onChange 없이 value만 주면(스토리) 읽기 전용으로 표시된다.
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type TextFieldState = "default" | "focused" | "disabled" | "error";
export type TextFieldSize = "lg" | "md" | "sm";

const SIZE: Record<
  TextFieldSize,
  { height: number; paddingX: number; gap: number; radius: number; iconSize: 16 | 20 }
> = {
  lg: { height: 48, paddingX: 16, gap: 8, radius: 12, iconSize: 20 },
  md: { height: 40, paddingX: 14, gap: 8, radius: 10, iconSize: 20 },
  sm: { height: 32, paddingX: 12, gap: 6, radius: 8, iconSize: 16 },
};

const BORDER: Record<TextFieldState, string> = {
  default: "1px solid var(--input)",
  focused: "2px solid var(--ring)",
  disabled: "1px solid var(--border)",
  error: "1.5px solid var(--destructive)",
};

export type TextFieldProps = {
  label: string;
  value?: string;
  placeholder?: string;
  type?: "text" | "password";
  state?: TextFieldState;
  size?: TextFieldSize;
  helper?: string;
  /** text 타입 전용 — password 타입에서는 렌더되지 않는다 */
  leadIcon?: DsIconName;
  fullWidth?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
};

export function TextField({
  label,
  value,
  placeholder,
  type = "text",
  state = "default",
  size = "md",
  helper,
  leadIcon,
  fullWidth = false,
  name,
  onChange,
  style,
}: TextFieldProps) {
  const s = SIZE[size];
  const disabled = state === "disabled";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        width: fullWidth ? "100%" : 220,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: -0.28,
          color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: s.gap,
          height: s.height,
          padding: `0 ${s.paddingX}px`,
          borderRadius: s.radius,
          background: disabled ? "var(--muted)" : "var(--card)",
          border: BORDER[state],
          boxSizing: "border-box",
        }}
      >
        {type === "text" && leadIcon && (
          <Icon name={leadIcon} size={s.iconSize} color="var(--muted-foreground)" />
        )}
        <input
          type={type}
          name={name}
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!onChange}
          onChange={(e) => onChange?.(e.target.value)}
          className="ds-input"
          style={{
            flex: 1,
            minWidth: 0,
            padding: 0,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "inherit",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: -0.32,
            color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        />
      </div>
      {helper && (
        <span
          style={{
            fontSize: 12,
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: -0.24,
            color: state === "error" ? "var(--destructive)" : "var(--muted-foreground)",
          }}
        >
          {helper}
        </span>
      )}
    </div>
  );
}
