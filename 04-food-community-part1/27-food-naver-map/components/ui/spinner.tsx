// design.pen Components/Spinner 핸드오프. 브랜드 컬러 회전 아이콘.
import type { CSSProperties } from "react";
import { Icon, type IconSize } from "./icon";

export type SpinnerProps = {
  size?: IconSize;
  /** CSS 색상 값 (기본: 브랜드 --primary) */
  color?: string;
  style?: CSSProperties;
};

export function Spinner({ size = 24, color = "var(--primary)", style }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="로딩 중"
      style={{
        display: "inline-flex",
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        ...style,
      }}
    >
      <Icon name="refresh" size={size} color={color} className="ds-spin" />
    </span>
  );
}
