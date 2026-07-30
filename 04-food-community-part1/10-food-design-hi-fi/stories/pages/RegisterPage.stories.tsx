import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PostFormPage } from "../../components/pages/post-form-page";

/**
 * design.pen `등록페이지-에러` 핸드오프.
 * 사진 업로드 → 이름·주소(지도 미리보기) → 내용 → 하단 CTA.
 * 필수값 누락 시 상단 에러 토스트 + 필드 에러 상태 (PRD P0 #4).
 */
const meta = {
  title: "Pages/등록",
  component: PostFormPage,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { mode: "register" },
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

/** 필수 항목 검증 실패 상태 — pen `등록페이지-에러` 프레임 그대로 */
export const Error: Story = { args: { error: true } };

/** 입력 전 기본 상태 */
export const Default: Story = {};
