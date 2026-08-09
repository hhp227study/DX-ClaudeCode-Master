// design.pen Components/Toast 핸드오프. Success/Error/Info/Warning + no-close·mobile 변형.
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { Icon } from "./icon";

export type ToastStatus = "success" | "error" | "info" | "warning";

const STATUS: Record<ToastStatus, { icon: DsIconName; color: string }> = {
  success: { icon: "check", color: "var(--color-success-foreground)" },
  error: { icon: "error", color: "var(--destructive)" },
  info: { icon: "info", color: "var(--color-info-foreground)" },
  warning: { icon: "warning", color: "var(--color-warning-foreground)" },
};

export type ToastProps = {
  status?: ToastStatus;
  message: string;
  /** 닫기 아이콘 표시 여부 */
  closable?: boolean;
  /** 모바일 - 화면 폭에 맞춤 (기본 400px 고정) */
  fullWidth?: boolean;
  onClose?: () => void;
  style?: CSSProperties;
};

export function Toast({
  status = "info",
  message,
  closable = true,
  fullWidth = false,
  onClose,
  style,
}: ToastProps) {
  const s = STATUS[status];
  return (
    <div
      role="status"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: fullWidth ? "100%" : 400,
        padding: "12px 16px",
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <Icon name={s.icon} size={20} color={s.color} />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 14,
          lineHeight: 1.4,
          letterSpacing: -0.28,
          color: "var(--foreground)",
        }}
      >
        {message}
      </span>
      {closable && (
        <span
          role="button"
          aria-label="닫기"
          onClick={onClose}
          style={{ display: "inline-flex", cursor: "pointer" }}
        >
          <Icon name="close" size={20} color="var(--muted-foreground)" />
        </span>
      )}
    </div>
  );
}
