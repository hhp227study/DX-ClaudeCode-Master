import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Badge, type BadgeSize, type BadgeVariant } from "../../components/ui/badge";

/** design.pen `Components/Badge` 핸드오프. 5개 변형 × md(20)/lg(24). */
const meta = {
  title: "Components/Badge",
  component: Badge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "한식", variant: "neutral", size: "md" },
  argTypes: {
    variant: {
      control: "select",
      options: ["neutral", "success", "error", "info", "warning"],
    },
    size: { control: "select", options: ["md", "lg"] },
  },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Neutral: Story = {};
export const Success: Story = { args: { variant: "success", children: "성공" } };
export const Error: Story = { args: { variant: "error", children: "오류" } };
export const Info: Story = { args: { variant: "info", children: "정보" } };
export const Warning: Story = { args: { variant: "warning", children: "주의" } };

/** pen 매트릭스 — 변형 × 사이즈 */
export const Matrix: Story = {
  render: () => {
    const LABEL: Record<BadgeVariant, string> = {
      neutral: "한식",
      success: "성공",
      error: "오류",
      info: "정보",
      warning: "주의",
    };
    return (
      <div style={{ display: "grid", gap: 12 }}>
        {(Object.keys(LABEL) as BadgeVariant[]).map((variant) => (
          <div key={variant} style={{ display: "flex", gap: 24, alignItems: "center" }}>
            {(["md", "lg"] as BadgeSize[]).map((size) => (
              <Badge key={size} variant={variant} size={size}>
                {LABEL[variant]}
              </Badge>
            ))}
          </div>
        ))}
      </div>
    );
  },
};
