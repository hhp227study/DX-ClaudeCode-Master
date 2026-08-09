import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomSheet } from "../../components/ui/bottom-sheet";
import { Menu, MenuItem } from "../../components/ui/menu";

/** design.pen `Components/BottomSheet` 핸드오프. 전체 폭, 상단 드래그 핸들. */
const meta = {
  title: "Components/BottomSheet",
  component: BottomSheet,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: null },
} satisfies Meta<typeof BottomSheet>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: (
      <div
        style={{
          height: 96,
          background: "var(--muted)",
          borderRadius: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 11,
          color: "var(--muted-foreground)",
        }}
      >
        콘텐츠 영역
      </div>
    ),
  },
};

/** 모바일 메뉴 사용 예 — 메뉴 아이템을 바텀시트에 담는다 */
export const WithMenuItems: Story = {
  args: {
    children: (
      <div style={{ display: "grid", gap: 2 }}>
        <MenuItem icon="edit">수정하기</MenuItem>
        <MenuItem icon="share">공유하기</MenuItem>
        <MenuItem destructive>삭제하기</MenuItem>
      </div>
    ),
  },
};

/** pen scrim-demo 재현 — 스크림 위 하단 고정 */
export const WithScrim: Story = {
  render: () => (
    <div
      style={{
        position: "relative",
        width: 360,
        height: 260,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--black)",
          opacity: 0.4,
        }}
      />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0 }}>
        <BottomSheet>
          <div
            style={{
              height: 96,
              background: "var(--muted)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-body), sans-serif",
              fontSize: 11,
              color: "var(--muted-foreground)",
            }}
          >
            콘텐츠 영역
          </div>
        </BottomSheet>
      </div>
    </div>
  ),
};
