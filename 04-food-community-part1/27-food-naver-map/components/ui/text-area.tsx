// design.pen Components/TextArea 핸드오프.
// 상태: Default/Focused/Disabled/Error, 높이 92, HelperRow(헬퍼 + 카운터)
// 실제 <textarea>를 렌더한다 — onChange 없이 value만 주면(스토리) 읽기 전용으로 표시된다.
import type { CSSProperties } from "react";

export type TextAreaState = "default" | "focused" | "disabled" | "error";

const BORDER: Record<TextAreaState, string> = {
  default: "1px solid var(--input)",
  focused: "2px solid var(--ring)",
  disabled: "1px solid var(--border)",
  error: "1.5px solid var(--destructive)",
};

export type TextAreaProps = {
  label: string;
  value?: string;
  placeholder?: string;
  state?: TextAreaState;
  helper?: string;
  /** 예: "86/200" */
  counter?: string;
  height?: number;
  fullWidth?: boolean;
  name?: string;
  onChange?: (value: string) => void;
  style?: CSSProperties;
};

export function TextArea({
  label,
  value,
  placeholder,
  state = "default",
  helper,
  counter,
  height = 92,
  fullWidth = false,
  name,
  onChange,
  style,
}: TextAreaProps) {
  const disabled = state === "disabled";
  const accentColor = state === "error" ? "var(--destructive)" : "var(--muted-foreground)";
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
          height,
          padding: "10px 14px",
          borderRadius: 10,
          background: disabled ? "var(--muted)" : "var(--card)",
          border: BORDER[state],
          boxSizing: "border-box",
          overflow: "hidden",
        }}
      >
        <textarea
          name={name}
          value={value ?? ""}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={!onChange}
          onChange={(e) => onChange?.(e.target.value)}
          className="ds-input"
          style={{
            display: "block",
            width: "100%",
            height: "100%",
            padding: 0,
            border: "none",
            outline: "none",
            resize: "none",
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
      {(helper || counter) && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.4,
              letterSpacing: -0.24,
              color: accentColor,
            }}
          >
            {helper}
          </span>
          {counter && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                lineHeight: 1.4,
                letterSpacing: -0.24,
                color: accentColor,
              }}
            >
              {counter}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
