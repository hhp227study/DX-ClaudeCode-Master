import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Skeleton } from "../../components/ui/skeleton";

/** design.pen `Components/Skeleton` 핸드오프. Text/Rect/Circle 3종. */
const meta = {
  title: "Components/Skeleton",
  component: Skeleton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: ["text", "rect", "circle"] },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = { args: { variant: "text" } };
export const Rect: Story = { args: { variant: "rect" } };
export const Circle: Story = { args: { variant: "circle" } };

/** pen usage-demo 재현 — 아바타 + 텍스트 2줄 조합 */
export const Composite: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <Skeleton variant="circle" />
      <div style={{ display: "grid", gap: 8 }}>
        <Skeleton variant="text" width={200} />
        <Skeleton variant="text" width={140} />
      </div>
    </div>
  ),
};

/** 맛집 카드 로딩 사용 예 */
export const CardLoading: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: 328,
        padding: 8,
        border: "1px solid var(--border-subtle)",
        borderRadius: 16,
      }}
    >
      <Skeleton variant="rect" width={96} height={96} style={{ borderRadius: 12 }} />
      <div style={{ display: "grid", gap: 8 }}>
        <Skeleton variant="text" width={48} height={14} style={{ borderRadius: 6 }} />
        <Skeleton variant="text" width={160} height={16} />
        <Skeleton variant="text" width={120} height={12} />
      </div>
    </div>
  ),
};
