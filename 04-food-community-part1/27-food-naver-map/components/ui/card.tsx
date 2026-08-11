// design.pen Components/Card 핸드오프. 기본(이미지 영역) / no-image 변형.
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icon";

export type CardProps = {
  title: string;
  description?: string;
  /** 이미지 영역 내용. 생략하면 플레이스홀더, false 면 이미지 영역 제거 */
  image?: ReactNode | false;
  width?: number | string;
  style?: CSSProperties;
};

export function Card({ title, description, image, width = 280, style }: CardProps) {
  return (
    <div
      style={{
        width,
        background: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        overflow: "hidden",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      {image !== false && (
        <div
          style={{
            height: 140,
            background: "var(--muted)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          {image ?? <Icon name="image" size={32} color="var(--muted-foreground)" />}
        </div>
      )}
      <div style={{ display: "grid", gap: 6, padding: 16 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: -0.32,
            color: "var(--foreground)",
          }}
        >
          {title}
        </div>
        {description && (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.4,
              letterSpacing: -0.28,
              color: "var(--muted-foreground)",
            }}
          >
            {description}
          </div>
        )}
      </div>
    </div>
  );
}
