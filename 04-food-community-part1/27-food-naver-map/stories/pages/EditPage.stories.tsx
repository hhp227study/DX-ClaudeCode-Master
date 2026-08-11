import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PostFormPage } from "../../components/pages/post-form-page";

/**
 * design.pen `수정페이지` 핸드오프.
 * 등록 폼과 같은 구조에 기존 값이 채워진 상태 — 사진 2장, 지도 미리보기, "수정 완료" CTA (PRD P0 #6).
 */
const meta = {
  title: "Pages/수정",
  component: PostFormPage,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { mode: "edit" },
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
} satisfies Meta<typeof PostFormPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
