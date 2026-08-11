import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { IconButton, type IconButtonVariant } from "../../components/ui/icon-button";
import { iconNames } from "../../lib/icons";

/**
 * design.pen `Components/IconButton` 핸드오프.
 * Ghost / CircleBrand / CircleNeutral, 48×48.
 */
const meta = {
  title: "Components/IconButton",
  component: IconButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { variant: "ghost", icon: "heart" },
  argTypes: {
    variant: { control: "select", options: ["ghost", "brand", "neutral"] },
    icon: { control: "select", options: iconNames },
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ghost: Story = {};
export const Brand: Story = { args: { variant: "brand" } };
export const Neutral: Story = { args: { variant: "neutral" } };

/** pen 스펙 그대로 — 3변형 나란히 */
export const AllVariants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 32 }}>
      {(["ghost", "brand", "neutral"] as IconButtonVariant[]).map((variant) => (
        <div
          key={variant}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <IconButton variant={variant} icon="heart" />
          <span
            style={{
              fontSize: 11,
              color: "var(--muted-foreground)",
              fontFamily: "var(--font-body), sans-serif",
              textTransform: "capitalize",
            }}
          >
            {variant}
          </span>
        </div>
      ))}
    </div>
  ),
};
