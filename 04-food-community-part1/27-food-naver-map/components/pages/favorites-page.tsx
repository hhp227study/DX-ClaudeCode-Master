// design.pen 즐겨찾기페이지 핸드오프
import type { CSSProperties } from "react";
import { RestaurantCard } from "../app/restaurant-card";
import { StatusBar } from "../app/status-bar";
import { BottomNavigation } from "../ui/bottom-navigation";
import { Chip } from "../ui/chip";
import { Icon } from "../ui/icon";

const SAVED = [
  {
    tag: "한식",
    name: "할머니 손칼국수",
    address: "구로구 개봉로 12",
    meta: "김구로 · 저장함",
    photoUrl:
      "https://images.unsplash.com/photo-1734313276340-cb45345c4454?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    tag: "카페",
    name: "골목 안 로스터리",
    address: "광명시 하안로 45",
    meta: "이주말 · 저장함",
    photoUrl:
      "https://images.unsplash.com/photo-1707126186328-c9e9c10d6c94?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    tag: "양식",
    name: "숲속 파스타집",
    address: "부천시 원미로 88",
    meta: "박커플 · 저장함",
    photoUrl:
      "https://images.unsplash.com/photo-1776810250123-119d15036790?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

export type FavoritesPageProps = {
  style?: CSSProperties;
};

export function FavoritesPage({ style }: FavoritesPageProps) {
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

      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 16px",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
          즐겨찾기
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="bookmark" size={16} color="var(--pink-500)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
            8곳
          </span>
        </span>
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "4px 16px 20px 16px",
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          <Chip selected>전체</Chip>
          <Chip>한식</Chip>
          <Chip>카페</Chip>
          <Chip>양식</Chip>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {SAVED.map((item) => (
            <RestaurantCard key={item.name} {...item} />
          ))}
        </div>
      </div>

      <BottomNavigation activeIndex={2} />
    </div>
  );
}
