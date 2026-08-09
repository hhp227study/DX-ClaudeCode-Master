import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MyPage } from "../../components/pages/my-page";

/**
 * design.pen `마이페이지` / `마이페이지-빈상태` 핸드오프.
 * 프로필·활동 통계·내가 쓴 글 목록·로그아웃, MY 탭 활성 (PRD P0 #7).
 */
const meta = {
  title: "Pages/마이페이지",
  component: MyPage,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div
        style={{
          border: "1px solid var(--border-subtle)",
          borderRadius: 16,
          overflow: "hidden",
          width: 360,
        }}
      >
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MyPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 글이 없을 때 빈 상태 안내 — PRD P0 #7 AC */
export const Empty: Story = { args: { empty: true } };
