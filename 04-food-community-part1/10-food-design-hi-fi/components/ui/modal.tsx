// design.pen Components/Modal 핸드오프. 확인/취소 다이얼로그. 스크림 탭 시 닫힘.
import type { CSSProperties, ReactNode } from "react";
import { Button } from "./button";
import { Icon } from "./icon";

export type ModalProps = {
  title: string;
  children: ReactNode;
  cancelLabel?: string;
  confirmLabel?: string;
  /** 확인 버튼을 Destructive 변형으로 (삭제 확인 등) */
  destructive?: boolean;
  onCancel?: () => void;
  onConfirm?: () => void;
  onClose?: () => void;
  style?: CSSProperties;
};

export function Modal({
  title,
  children,
  cancelLabel = "취소",
  confirmLabel = "확인",
  destructive = false,
  onCancel,
  onConfirm,
  onClose,
  style,
}: ModalProps) {
  return (
    <div
      role="dialog"
      aria-modal
      aria-label={title}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: 320,
        padding: 20,
        background: "var(--card)",
        borderRadius: 16,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: -0.32,
            color: "var(--foreground)",
          }}
        >
          {title}
        </span>
        <span
          role="button"
          aria-label="닫기"
          onClick={onClose}
          style={{ display: "inline-flex", cursor: "pointer" }}
        >
          <Icon name="close" size={16} color="var(--muted-foreground)" />
        </span>
      </div>
      <div
        style={{
          fontSize: 14,
          lineHeight: 1.4,
          letterSpacing: -0.28,
          color: "var(--foreground)",
        }}
      >
        {children}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
        }}
      >
        <Button variant="secondary" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={destructive ? "destructive" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
