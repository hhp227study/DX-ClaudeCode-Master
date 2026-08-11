import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { BottomNavigation } from "../../components/ui/bottom-navigation";

/**
 * design.pen `Components/BottomNavigation` 핸드오프.
 * 고정 4탭(홈/검색/즐겨찾기/MY), 활성 탭 `--primary`. 변형: icon-only.
 */
const meta = {
  title: "Components/BottomNavigation",
  component: BottomNavigation,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { activeIndex: 0, iconOnly: false },
  argTypes: {
    activeIndex: { control: "select", options: [0, 1, 2, 3] },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360, border: "1px solid var(--border-subtle)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof BottomNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const IconOnly: Story = { args: { iconOnly: true } };

/** 탭별 활성 상태 4종 */
export const ActiveStates: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {([0, 1, 2, 3] as const).map((i) => (
        <div key={i} style={{ width: 360, border: "1px solid var(--border-subtle)" }}>
          <BottomNavigation activeIndex={i} />
        </div>
      ))}
    </div>
  ),
};
