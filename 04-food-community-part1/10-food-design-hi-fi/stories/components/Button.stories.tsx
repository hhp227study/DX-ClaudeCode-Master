import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button, type ButtonSize, type ButtonVariant } from "../../components/ui/button";
import { iconNames } from "../../lib/icons";

/**
 * design.pen `Components/Button` 핸드오프.
 * Primary·Secondary·Destructive × lg(48)/md(40)/sm(32) × Default/Disabled/Loading.
 */
const meta = {
  title: "Components/Button",
  component: Button,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "버튼", variant: "primary", size: "md", leadIcon: "plus" },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "destructive"] },
    size: { control: "select", options: ["lg", "md", "sm"] },
    leadIcon: { control: "select", options: [undefined, ...iconNames] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};
export const Secondary: Story = { args: { variant: "secondary" } };
export const Destructive: Story = { args: { variant: "destructive", children: "삭제하기", leadIcon: "delete" } };
export const Disabled: Story = { args: { disabled: true } };
export const Loading: Story = { args: { loading: true } };

/** pen 스펙 매트릭스 그대로 — 변형 × 상태 × 사이즈 */
export const Matrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {(["primary", "secondary", "destructive"] as ButtonVariant[]).map((variant) => (
        <section
          key={variant}
          style={{
            display: "grid",
            gap: 12,
            padding: 20,
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <strong style={{ fontSize: 12, textTransform: "capitalize" }}>{variant}</strong>
          {(["lg", "md", "sm"] as ButtonSize[]).map((size) => (
            <div key={size} style={{ display: "flex", gap: 24, alignItems: "center" }}>
              <Button variant={variant} size={size} leadIcon="plus">버튼</Button>
              <Button variant={variant} size={size} leadIcon="plus" disabled>버튼</Button>
              <Button variant={variant} size={size} loading>버튼</Button>
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};
