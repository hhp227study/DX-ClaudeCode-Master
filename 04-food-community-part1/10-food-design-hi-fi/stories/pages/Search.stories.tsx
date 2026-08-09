import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { SearchPage } from "../../components/pages/search-page";

/**
 * design.pen 검색페이지-빈상태 핸드오프.
 * 검색 결과가 없을 때 Empty 컴포넌트로 등록 유도 (PRD P0 #3).
 */
const meta = {
  title: "Pages/검색",
  component: SearchPage,
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
} satisfies Meta<typeof SearchPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};
export const OtherQuery: Story = { args: { query: "떡볶이" } };
