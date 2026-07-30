// design.pen 상세페이지 / 상세페이지-작성자 / 상세페이지-삭제확인 핸드오프
import type { CSSProperties } from "react";
import { StatusBar } from "../app/status-bar";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { Modal } from "../ui/modal";
import { TopNavigation } from "../ui/top-navigation";

const PHOTO_URL =
  "https://images.unsplash.com/photo-1734313276340-cb45345c4454?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w4NDM0ODN8MHwxfHJhbmRvbXx8fHx8fHx8fDE3ODQ4NjE5NjV8&ixlib=rb-4.1.0&q=80&w=1080";

const CONTENT =
  "골목 안쪽에 숨어있어서 아는 사람만 가는 칼국수집이에요. 멸치 육수가 진하고 면발이 쫄깃합니다.\n\n주차는 가게 앞에 3~4대 정도 가능하고, 주말 점심에는 대기가 조금 있어요. 아이 의자도 있어서 가족 단위로 가기 좋았습니다.";

export type DetailPageProps = {
  /** 작성자 본인 뷰 — 저장 버튼 대신 "내가 쓴 글" 배지, 하단 수정/삭제 액션 노출 */
  owner?: boolean;
  /** 삭제 확인 다이얼로그 오버레이 (작성자 뷰 위에 표시) */
  deleteConfirm?: boolean;
  style?: CSSProperties;
};

function Divider() {
  return <div style={{ height: 1, background: "var(--border-subtle)" }} />;
}

export function DetailPage({ owner = false, deleteConfirm = false, style }: DetailPageProps) {
  const isOwner = owner || deleteConfirm;
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
        ...style,
      }}
    >
      <StatusBar />
      <TopNavigation title="맛집 상세" />
      <div
        style={{
          position: "relative",
          height: 280,
          background: `var(--bg-muted) url(${PHOTO_URL}) center / cover no-repeat`,
        }}
      >
        <span
          style={{
            position: "absolute",
            right: 16,
            bottom: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 44,
            height: 24,
            borderRadius: 12,
            background: "#00000080",
            color: "var(--white)",
            fontSize: 11,
            fontWeight: 500,
          }}
        >
          1 / 3
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 16,
          padding: "16px 16px 24px 16px",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-start" }}>
          <Badge variant="neutral">한식</Badge>
          <h1
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            할머니 손칼국수
          </h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              flexShrink: 0,
              borderRadius: 16,
              background: "var(--pink-200)",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
              김구로
            </span>
            <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>2026년 7월 22일</span>
          </div>
          {isOwner ? (
            <Badge variant="neutral">내가 쓴 글</Badge>
          ) : (
            <Button variant="secondary" leadIcon="bookmark">
              저장
            </Button>
          )}
        </div>
        <Divider />
        <p
          style={{
            margin: 0,
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-primary)",
            whiteSpace: "pre-line",
          }}
        >
          {CONTENT}
        </p>
        <Divider />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="home" size={16} color="var(--pink-500)" />
            <span
              style={{
                flex: 1,
                minWidth: 0,
                fontSize: 13,
                fontWeight: 500,
                color: "var(--text-primary)",
              }}
            >
              서울 구로구 개봉로 12
            </span>
            <Button variant="secondary" leadIcon="copy">
              복사
            </Button>
          </div>
          {/* MCP export_nodes로 추출한 지도 이미지 (핀 포함) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/map.svg"
            alt="맛집 위치 지도"
            style={{
              width: "100%",
              height: 160,
              borderRadius: 12,
              objectFit: "cover",
              display: "block",
            }}
          />
        </div>
        {isOwner && (
          <div style={{ display: "flex", gap: 8 }}>
            <Button variant="secondary" leadIcon="edit" fullWidth style={{ flex: 1 }}>
              수정하기
            </Button>
            <Button variant="destructive" leadIcon="delete" fullWidth style={{ flex: 1 }}>
              삭제하기
            </Button>
          </div>
        )}
      </div>
      {deleteConfirm && (
        <>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--black)",
              opacity: 0.4,
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Modal
              title="글을 삭제할까요?"
              cancelLabel="취소"
              confirmLabel="삭제"
              destructive
            >
              삭제한 글은 복구할 수 없어요. 등록한 사진과 내용이 함께 삭제됩니다.
            </Modal>
          </div>
        </>
      )}
    </div>
  );
}
