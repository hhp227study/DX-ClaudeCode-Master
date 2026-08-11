// design.pen 메인페이지 / 메인페이지-로딩 핸드오프
import type { CSSProperties, ReactNode } from "react";
import { RestaurantCard } from "../app/restaurant-card";
import { StatusBar } from "../app/status-bar";
import { BottomNavigation } from "../ui/bottom-navigation";
import { Icon } from "../ui/icon";
import { IconButton } from "../ui/icon-button";
import { Skeleton } from "../ui/skeleton";
import { Spinner } from "../ui/spinner";

const RESTAURANTS = [
  {
    photoUrl:
      "https://images.unsplash.com/photo-1775883374700-bddbb6c80fcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5NjZ8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "한식",
    name: "할머니 손칼국수",
    address: "구로구 개봉로 12",
    meta: "김구로 · 2일 전",
  },
  {
    photoUrl:
      "https://images.unsplash.com/photo-1623659228341-21bc94462e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njd8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "카페",
    name: "골목 안 로스터리",
    address: "광명시 하안로 45",
    meta: "이주말 · 4일 전",
  },
  {
    photoUrl:
      "https://images.unsplash.com/photo-1669880210910-57960a74e1db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njd8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "양식",
    name: "숲속 파스타집",
    address: "부천시 원미로 88",
    meta: "박커플 · 6일 전",
  },
  {
    photoUrl:
      "https://images.unsplash.com/photo-1589899476489-2b5e3e2b323f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5Njh8&ixlib=rb-4.1.0&q=80&w=1080",
    tag: "한식",
    name: "기와집 보리밥",
    address: "양천구 신월로 3",
    meta: "최나들 · 1주 전",
  },
];

const CATEGORIES = [
  { emoji: "🍚", label: "한식" },
  { emoji: "☕", label: "카페" },
  { emoji: "🍝", label: "양식" },
  { emoji: "🅿️", label: "주차" },
  { emoji: "➕", label: "전체" },
];

function SearchBar() {
  return (
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
      <span style={{ flex: 1, fontSize: 14, color: "var(--text-tertiary)" }}>
        맛집 이름·지역으로 검색
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: 8,
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
      }}
    >
      <Skeleton variant="rect" width={96} height={96} style={{ borderRadius: 12, flexShrink: 0 }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Skeleton variant="text" width={48} height={14} style={{ borderRadius: 6 }} />
        <Skeleton variant="text" width={160} height={16} />
        <Skeleton variant="text" width={120} height={12} />
      </div>
    </div>
  );
}

export type MainPageProps = {
  /** 초기 로딩 상태 (스켈레톤 + 무한스크롤 스피너) */
  loading?: boolean;
  style?: CSSProperties;
};

export function MainPage({ loading = false, style }: MainPageProps) {
  let body: ReactNode;
  if (loading) {
    body = (
      <>
        <SearchBar />
        <Skeleton variant="rect" width="100%" height={120} style={{ borderRadius: 16 }} />
        <Skeleton variant="text" width={140} height={18} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: "4px 0",
          }}
        >
          <Spinner size={24} />
          <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
            맛집을 더 불러오는 중...
          </span>
        </div>
      </>
    );
  } else {
    body = (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="home" size={16} color="var(--pink-500)" />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            구로구 개봉동
          </span>
          <Icon name="chevron-down" size={16} color="var(--text-secondary)" />
        </div>
        <SearchBar />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: 20,
            borderRadius: 16,
            background: "linear-gradient(115deg,#FF3E7F,#FF7DA6)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ display: "flex" }}>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--white)",
                  background: "#FFFFFF33",
                  borderRadius: 6,
                  padding: "3px 8px",
                }}
              >
                이번 주 추천
              </span>
            </span>
            <strong
              style={{
                fontSize: 18,
                fontWeight: 800,
                color: "var(--white)",
                lineHeight: 1.3,
                whiteSpace: "pre-line",
              }}
            >
              {"동네 이웃이 찾은\n숨은 맛집 12곳"}
            </strong>
            <span style={{ fontSize: 12, color: "#FFFFFFCC" }}>주말 나들이 코스로 딱</span>
          </div>
          <span style={{ fontSize: 52 }}>🍜</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  background: "var(--pink-100)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                }}
              >
                {cat.emoji}
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 4,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            구로 주변 숨은 맛집
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>
              최신순
            </span>
            <Icon name="chevron-down" size={16} color="var(--text-secondary)" />
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {RESTAURANTS.map((r) => (
            <RestaurantCard key={r.name} {...r} />
          ))}
        </div>
      </>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        width: 360,
        minHeight: 780,
        background: "var(--bg-page)",
        fontFamily: "var(--font-body), sans-serif",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <StatusBar />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 20, color: "var(--pink-500)" }}>🍽</span>
          <span
            style={{
              fontFamily: "var(--font-brand), sans-serif",
              fontSize: 20,
              color: "var(--text-primary)",
            }}
          >
            숨은맛집
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconButton variant="ghost" icon="notification" iconColor="var(--text-primary)" />
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 14,
              background: "var(--pink-200)",
            }}
          />
        </div>
      </div>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "8px 16px 20px",
        }}
      >
        {body}
      </div>
      <BottomNavigation activeIndex={0} />
      {!loading && (
        <IconButton
          variant="brand"
          icon="plus"
          style={{
            position: "absolute",
            right: 16,
            bottom: 90,
            width: 56,
            height: 56,
            background: "var(--pink-500)",
            boxShadow: "0 6px 16px #FF3E7F55",
          }}
        />
      )}
    </div>
  );
}
