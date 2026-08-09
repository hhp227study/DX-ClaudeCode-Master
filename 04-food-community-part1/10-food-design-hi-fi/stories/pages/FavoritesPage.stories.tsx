import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FavoritesPage } from "../../components/pages/favorites-page";

/**
 * design.pen `즐겨찾기페이지` 핸드오프.
 * 카테고리 칩 필터 + 저장한 맛집 카드 목록, 즐겨찾기 탭 활성.
 */
const meta = {
  title: "Pages/즐겨찾기",
  component: FavoritesPage,
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
} satisfies Meta<typeof FavoritesPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
