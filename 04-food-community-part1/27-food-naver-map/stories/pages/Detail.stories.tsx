import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { DetailPage } from "../../components/pages/detail-page";

/**
 * design.pen 상세페이지 핸드오프.
 * - Default: 일반 사용자 뷰 (저장 버튼)
 * - Owner: 작성자 뷰 — "내가 쓴 글" 배지 + 수정/삭제 액션 (PRD P0 #6)
 * - DeleteConfirm: 삭제 확인 다이얼로그 오버레이
 */
const meta = {
  title: "Pages/상세",
  component: DetailPage,
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
} satisfies Meta<typeof DetailPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Owner: Story = { args: { owner: true } };
export const DeleteConfirm: Story = { args: { owner: true, deleteConfirm: true } };
