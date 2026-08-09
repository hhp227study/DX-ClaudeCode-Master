// design.pen 검색페이지-빈상태 핸드오프
import type { CSSProperties } from "react";
import { StatusBar } from "../app/status-bar";
import { BottomNavigation } from "../ui/bottom-navigation";
import { Chip } from "../ui/chip";
import { Empty } from "../ui/empty";
import { Icon } from "../ui/icon";

export type SearchPageProps = {
  /** 검색창에 입력된 검색어 */
  query?: string;
  style?: CSSProperties;
};

export function SearchPage({ query = "수제버거", style }: SearchPageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 360,
        minHeight: 780,
        background: "var(--bg-page)",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <StatusBar />
      <div style={{ padding: "8px 16px 4px 16px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
            background: "var(--bg-muted)",
            borderRadius: 12,
          }}
        >
          <Icon name="search" size={20} color="var(--text-tertiary)" />
          <span
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: 14,
              color: "var(--text-primary)",
            }}
          >
            {query}
          </span>
          <Icon name="close" size={20} color="var(--text-tertiary)" />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "8px 16px 20px 16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            최근 검색어
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <Chip>칼국수</Chip>
            <Chip>브런치</Chip>
            <Chip>파스타</Chip>
          </div>
        </div>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Empty
            icon="search"
            title="검색 결과가 없어요"
            description={`'${query}' 맛집을 아직 찾지 못했어요.\n첫 번째로 등록해보세요!`}
            secondaryAction={{ label: "전체 맛집 보기" }}
            primaryAction={{ label: "맛집 등록하기" }}
          />
        </div>
      </div>
      <BottomNavigation activeIndex={1} />
    </div>
  );
}
