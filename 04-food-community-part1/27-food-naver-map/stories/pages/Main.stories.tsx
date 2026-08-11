import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MainPage } from "../../components/pages/main-page";

/**
 * design.pen `메인페이지` / `메인페이지-로딩` 핸드오프.
 * 무한스크롤 목록 + 검색창 + 플로팅 글쓰기 버튼 (PRD P0 #2·#3).
 * 로딩 상태는 Skeleton + Spinner 조합.
 */
const meta = {
  title: "Pages/메인",
  component: MainPage,
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
} satisfies Meta<typeof MainPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 초기 로딩 — 스켈레톤 카드 + 무한스크롤 스피너 */
export const Loading: Story = { args: { loading: true } };
