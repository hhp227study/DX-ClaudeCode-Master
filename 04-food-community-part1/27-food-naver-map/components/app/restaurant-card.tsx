// design.pen component/RestaurantCard 핸드오프 — 목록·즐겨찾기·마이페이지의 맛집 카드
import type { CSSProperties } from "react";
import { Icon } from "../ui/icon";

export type RestaurantCardProps = {
  /** 대표 사진 URL. 없으면 회색 플레이스홀더 */
  photoUrl?: string;
  /** 카테고리 태그 (한식·카페·양식 등) */
  tag: string;
  name: string;
  address: string;
  /** 작성자·시간 메타 (예: "김구로 · 2일 전") */
  meta: string;
  onClick?: () => void;
  style?: CSSProperties;
};

export function RestaurantCard({
  photoUrl,
  tag,
  name,
  address,
  meta,
  onClick,
  style,
}: RestaurantCardProps) {
  return (
    <article
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 8,
        background: "var(--bg-page)",
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
        cursor: onClick ? "pointer" : undefined,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <div
        style={{
          width: 96,
          height: 96,
          flexShrink: 0,
          borderRadius: 12,
          background: photoUrl
            ? `var(--bg-muted) url(${photoUrl}) center / cover no-repeat`
            : "var(--bg-muted)",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 6,
          minWidth: 0,
          flex: 1,
          padding: "2px 0",
        }}
      >
        <span style={{ display: "flex" }}>
          <span
            style={{
              background: "var(--pink-100)",
              color: "var(--pink-600)",
              borderRadius: 6,
              padding: "3px 8px",
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            {tag}
          </span>
        </span>
        <strong
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text-primary)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </strong>
        <span style={{ display: "flex", alignItems: "center", gap: 3, minWidth: 0 }}>
          <Icon name="home" size={16} color="var(--text-tertiary)" />
          <span
            style={{
              fontSize: 12,
              color: "var(--text-secondary)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {address}
          </span>
        </span>
        <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{meta}</span>
      </div>
    </article>
  );
}
