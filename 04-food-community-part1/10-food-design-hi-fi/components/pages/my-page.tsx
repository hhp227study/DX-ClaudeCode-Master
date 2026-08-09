// design.pen 마이페이지 / 마이페이지-빈상태 핸드오프
import type { CSSProperties } from "react";
import { RestaurantCard } from "../app/restaurant-card";
import { StatusBar } from "../app/status-bar";
import { BottomNavigation } from "../ui/bottom-navigation";
import { Button } from "../ui/button";
import { Empty } from "../ui/empty";
import { IconButton } from "../ui/icon-button";

const MY_POSTS = [
  {
    tag: "한식",
    name: "할머니 손칼국수",
    address: "구로구 개봉로 12",
    meta: "2일 전",
    photoUrl:
      "https://images.unsplash.com/photo-1775883374700-bddbb6c80fcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
  {
    tag: "카페",
    name: "골목 안 로스터리",
    address: "광명시 하안로 45",
    meta: "1주 전",
    photoUrl:
      "https://images.unsplash.com/photo-1645536024589-0c25fb936d74?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
  },
];

function Stat({ num, label }: { num: string; label: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 3,
      }}
    >
      <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{num}</span>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--text-secondary)" }}>
        {label}
      </span>
    </div>
  );
}

function StatDivider() {
  return <span style={{ width: 1, height: 32, background: "var(--border-strong)" }} />;
}

export type MyPageProps = {
  /** 글이 없는 신규 사용자 상태 */
  empty?: boolean;
  style?: CSSProperties;
};

export function MyPage({ empty = false, style }: MyPageProps) {
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
          padding: "4px 4px 4px 16px",
        }}
      >
        <span style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
          마이페이지
        </span>
        <IconButton variant="ghost" icon="settings" iconColor="var(--text-secondary)" />
      </header>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: "8px 16px 20px 16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              background: "var(--pink-200)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 24, fontWeight: 700, color: "var(--pink-600)" }}>김</span>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>
              김구로
            </span>
            <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
              {empty ? "구로구 개봉동 · 새 이웃" : "구로구 개봉동 · 이웃 맛집러"}
            </span>
          </div>
          <Button variant="secondary" leadIcon="edit">
            프로필 수정
          </Button>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "var(--bg-muted)",
            borderRadius: 14,
            padding: "16px 0",
          }}
        >
          <Stat num={empty ? "0" : "12"} label="내가 쓴 글" />
          <StatDivider />
          <Stat num={empty ? "0" : "8"} label="저장한 곳" />
          <StatDivider />
          <Stat num={empty ? "0" : "34"} label="받은 좋아요" />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, paddingTop: 4 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            내가 쓴 글
          </span>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--pink-500)" }}>
            {empty ? "0" : "12"}
          </span>
        </div>

        {empty ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Empty
              icon="edit"
              title="아직 등록한 맛집이 없어요"
              description={"내가 아는 숨은 맛집을\n이웃에게 처음으로 소개해보세요!"}
              secondaryAction={{ label: "맛집 구경하기" }}
              primaryAction={{ label: "맛집 등록하기" }}
            />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {MY_POSTS.map((post) => (
              <RestaurantCard key={post.name} {...post} />
            ))}
          </div>
        )}

        <Button variant="secondary" leadIcon="logout" fullWidth>
          로그아웃
        </Button>
      </div>

      <BottomNavigation activeIndex={3} />
    </div>
  );
}
