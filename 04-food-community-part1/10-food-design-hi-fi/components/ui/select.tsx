// design.pen Components/Select + Components/SelectItem 핸드오프.
// Select: Default/Focused/Disabled/Error × lg/md/sm, SelectItem: Default/Selected/Disabled × lg/md/sm
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icon";

export type SelectState = "default" | "focused" | "disabled" | "error";
export type SelectSize = "lg" | "md" | "sm";

const SIZE: Record<
  SelectSize,
  { height: number; paddingX: number; radius: number; iconSize: 16 | 20 }
> = {
  lg: { height: 48, paddingX: 16, radius: 12, iconSize: 20 },
  md: { height: 40, paddingX: 14, radius: 10, iconSize: 20 },
  sm: { height: 32, paddingX: 12, radius: 8, iconSize: 16 },
};

const BORDER: Record<SelectState, string> = {
  default: "1px solid var(--input)",
  focused: "2px solid var(--ring)",
  disabled: "1px solid var(--border)",
  error: "1.5px solid var(--destructive)",
};

export type SelectProps = {
  label: string;
  value?: string;
  placeholder?: string;
  state?: SelectState;
  size?: SelectSize;
  helper?: string;
  fullWidth?: boolean;
  style?: CSSProperties;
};

export function Select({
  label,
  value,
  placeholder,
  state = "default",
  size = "md",
  helper,
  fullWidth = false,
  style,
}: SelectProps) {
  const s = SIZE[size];
  const disabled = state === "disabled";
  const hasValue = value !== undefined && value !== "";
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
          justifyContent: "space-between",
          height: s.height,
          padding: `0 ${s.paddingX}px`,
          borderRadius: s.radius,
          background: disabled ? "var(--muted)" : "var(--card)",
          border: BORDER[state],
          boxSizing: "border-box",
        }}
      >
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 16,
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: -0.32,
            color: disabled || !hasValue ? "var(--muted-foreground)" : "var(--foreground)",
          }}
        >
          {hasValue ? value : placeholder}
        </span>
        <Icon name="chevron-down" size={s.iconSize} color="var(--muted-foreground)" />
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

const ITEM_SIZE: Record<SelectSize, { height: number; paddingX: number; iconSize: 16 | 20 }> = {
  lg: { height: 48, paddingX: 16, iconSize: 20 },
  md: { height: 40, paddingX: 14, iconSize: 20 },
  sm: { height: 32, paddingX: 12, iconSize: 16 },
};

export type SelectItemProps = {
  selected?: boolean;
  disabled?: boolean;
  size?: SelectSize;
  style?: CSSProperties;
  children: ReactNode;
};

export function SelectItem({
  selected = false,
  disabled = false,
  size = "md",
  style,
  children,
}: SelectItemProps) {
  const s = ITEM_SIZE[size];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: selected ? "space-between" : "flex-start",
        height: s.height,
        padding: `0 ${s.paddingX}px`,
        borderRadius: 8,
        background: selected ? "var(--accent)" : undefined,
        boxSizing: "border-box",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 16,
          fontWeight: 400,
          lineHeight: 1.4,
          letterSpacing: -0.32,
          color: disabled ? "var(--muted-foreground)" : "var(--foreground)",
        }}
      >
        {children}
      </span>
      {selected && <Icon name="check" size={s.iconSize} color="var(--foreground)" />}
    </div>
  );
}
