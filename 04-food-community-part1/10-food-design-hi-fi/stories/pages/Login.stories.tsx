import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LoginPage } from "../../components/pages/login-page";

/**
 * design.pen `로그인페이지` / `로그인페이지-에러` 핸드오프.
 * 구글 OAuth 단일 진입점 (PRD P0 #1). 실패 시 Toast/Error 노출.
 */
const meta = {
  title: "Pages/로그인",
  component: LoginPage,
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
} satisfies Meta<typeof LoginPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 로그인 실패 — 상단 에러 토스트 */
export const Error: Story = { args: { error: true } };
