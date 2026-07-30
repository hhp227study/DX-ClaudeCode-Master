import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TopNavigation } from "../../components/ui/top-navigation";
import { iconNames } from "../../lib/icons";

/**
 * design.pen `Components/TopNavigation` 핸드오프.
 * default (좌: 뒤로가기, 우: 더보기) / title-only.
 */
const meta = {
  title: "Components/TopNavigation",
  component: TopNavigation,
  parameters: { layout: "padded" },
  tags: ["autodocs"],
  args: { title: "맛집 상세", variant: "default" },
  argTypes: {
    variant: { control: "select", options: ["default", "title-only"] },
    leftIcon: { control: "select", options: iconNames },
    rightIcon: { control: "select", options: iconNames },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 360, border: "1px solid var(--border-subtle)" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TopNavigation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const TitleOnly: Story = { args: { variant: "title-only", title: "마이페이지" } };
export const CustomIcons: Story = {
  args: { title: "맛집 등록", leftIcon: "close", rightIcon: "check" },
};
