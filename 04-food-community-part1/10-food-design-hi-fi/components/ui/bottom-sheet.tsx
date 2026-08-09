// design.pen Components/BottomSheet 핸드오프. 전체 폭, 상단 드래그 핸들.
import type { CSSProperties, ReactNode } from "react";

export type BottomSheetProps = {
  children: ReactNode;
  width?: number | string;
  style?: CSSProperties;
};

export function BottomSheet({ children, width = 360, style }: BottomSheetProps) {
  return (
    <div
      role="dialog"
      aria-modal
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
        width,
        padding: "8px 16px 16px 16px",
        background: "var(--card)",
        borderRadius: "16px 16px 0 0",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          width: 32,
          height: 4,
          borderRadius: "var(--radius-pill)",
          background: "var(--border)",
        }}
      />
      <div style={{ width: "100%" }}>{children}</div>
    </div>
  );
}
