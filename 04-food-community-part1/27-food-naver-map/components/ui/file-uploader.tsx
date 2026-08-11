// design.pen Components/FileUploader 핸드오프.
// Dropzone: Default/Dragover/Disabled/Error, FileItem: Uploading/Complete/Error
import type { CSSProperties } from "react";
import { Icon } from "./icon";

export type DropzoneState = "default" | "dragover" | "disabled" | "error";

const DROPZONE_BORDER: Record<DropzoneState, string> = {
  default: "1.5px solid var(--input)",
  dragover: "2px solid var(--primary)",
  disabled: "1.5px solid var(--border)",
  error: "1.5px solid var(--destructive)",
};

export type DropzoneProps = {
  state?: DropzoneState;
  guideText?: string;
  browseLabel?: string;
  fullWidth?: boolean;
  style?: CSSProperties;
};

export function Dropzone({
  state = "default",
  guideText = "사진을 여기에 끌어다 놓아주세요",
  browseLabel = "파일 선택",
  fullWidth = false,
  style,
}: DropzoneProps) {
  const disabled = state === "disabled";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        width: fullWidth ? "100%" : 260,
        padding: "24px 16px",
        borderRadius: 12,
        background: disabled ? "var(--muted)" : "var(--card)",
        border: DROPZONE_BORDER[state],
        boxSizing: "border-box",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 14,
          fontWeight: 400,
          lineHeight: 1.4,
          letterSpacing: -0.28,
          color: "var(--muted-foreground)",
        }}
      >
        {guideText}
      </span>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          height: 32,
          padding: "0 12px",
          borderRadius: 8,
          background: disabled ? "var(--muted)" : "var(--secondary)",
          color: disabled ? "var(--muted-foreground)" : "var(--secondary-foreground)",
          fontSize: 14,
          fontWeight: 600,
          lineHeight: 1.4,
          letterSpacing: -0.28,
        }}
      >
        {browseLabel}
      </span>
    </div>
  );
}

export type FileItemStatus = "uploading" | "complete" | "error";

const STATUS_DEFAULT_TEXT: Record<FileItemStatus, string> = {
  uploading: "업로드 중...",
  complete: "업로드 완료",
  error: "업로드 실패",
};

export type FileItemProps = {
  status: FileItemStatus;
  fileName: string;
  statusText?: string;
  fullWidth?: boolean;
  /** 닫기(X) 클릭 시 호출 — 없으면 표시만 한다 */
  onRemove?: () => void;
  style?: CSSProperties;
};

export function FileItem({
  status,
  fileName,
  statusText,
  fullWidth = false,
  onRemove,
  style,
}: FileItemProps) {
  const text = statusText ?? STATUS_DEFAULT_TEXT[status];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        width: fullWidth ? "100%" : 300,
        padding: "8px 10px",
        borderRadius: 10,
        background: "var(--card)",
        border: "1px solid var(--border)",
        boxSizing: "border-box",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 40,
          height: 40,
          borderRadius: 8,
          background: "var(--muted)",
          flexShrink: 0,
        }}
      >
        <Icon name="image" size={20} color="var(--muted-foreground)" />
      </span>
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: 14,
            fontWeight: 400,
            lineHeight: 1.4,
            letterSpacing: -0.28,
            color: "var(--foreground)",
          }}
        >
          {fileName}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {status === "uploading" && (
            <Icon name="refresh" size={16} color="var(--muted-foreground)" className="ds-spin" />
          )}
          {status === "complete" && <Icon name="check" size={16} color="var(--primary)" />}
          {status === "error" && <Icon name="error" size={16} color="var(--destructive)" />}
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              lineHeight: 1.4,
              letterSpacing: -0.24,
              color: status === "error" ? "var(--destructive)" : "var(--muted-foreground)",
            }}
          >
            {text}
          </span>
        </span>
      </div>
      <span
        role={onRemove ? "button" : undefined}
        aria-label={onRemove ? `${fileName} 제거` : undefined}
        onClick={onRemove}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          flexShrink: 0,
          cursor: "pointer",
        }}
      >
        <Icon name="close" size={16} color="var(--muted-foreground)" />
      </span>
    </div>
  );
}
