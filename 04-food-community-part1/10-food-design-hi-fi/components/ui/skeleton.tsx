// design.pen Components/Skeleton 핸드오프. Text/Rect/Circle 3종.
import type { CSSProperties } from "react";

export type SkeletonVariant = "text" | "rect" | "circle";

const DEFAULT_SIZE: Record<SkeletonVariant, { width: number; height: number; radius: number | string }> = {
  text: { width: 160, height: 20, radius: 4 },
  rect: { width: 120, height: 80, radius: 8 },
  circle: { width: 48, height: 48, radius: "var(--radius-pill)" },
};

export type SkeletonProps = {
  variant?: SkeletonVariant;
  /** circle 은 지름으로 사용된다 */
  width?: number | string;
  height?: number | string;
  style?: CSSProperties;
};

export function Skeleton({ variant = "text", width, height, style }: SkeletonProps) {
  const d = DEFAULT_SIZE[variant];
  const w = width ?? d.width;
  const h = variant === "circle" ? (height ?? width ?? d.height) : (height ?? d.height);
  return (
    <div
      aria-hidden
      style={{
        width: w,
        height: h,
        background: "var(--muted)",
        borderRadius: d.radius,
        ...style,
      }}
    />
  );
}
