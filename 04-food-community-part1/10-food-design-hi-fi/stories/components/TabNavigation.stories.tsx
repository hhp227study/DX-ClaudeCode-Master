import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TabNavigation } from "../../components/ui/tab-navigation";

/**
 * design.pen `Components/TabNavigation` 핸드오프.
 * 균등폭 탭(기본 120px), 활성 탭 하단 2px `--primary` 인디케이터.
 */
const meta = {
  title: "Components/TabNavigation",
  component: TabNavigation,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { tabs: ["전체", "한식", "카페"], activeIndex: 0 },
} satisfies Meta<typeof TabNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** 360px 모바일 폭을 균등 분배 */
export const FullWidth: Story = {
  args: { fullWidth: true },
  decorators: [
    (Story) => (
      <div style={{ width: 360, border: "1px solid var(--border-subtle)" }}>
        <Story />
      </div>
    ),
  ],
};

export const SecondActive: Story = { args: { activeIndex: 1 } };
