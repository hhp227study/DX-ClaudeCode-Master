import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Switch, type SwitchSize } from "../../components/ui/switch";

/**
 * design.pen `Components/Switch` 핸드오프.
 * Off/On × Default/Disabled × md(40×20)/sm(32×16).
 */
const meta = {
  title: "Components/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { label: "알림 받기", on: false, disabled: false, size: "md" },
  argTypes: {
    size: { control: "select", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {};
export const On: Story = { args: { on: true } };
export const Disabled: Story = { args: { on: true, disabled: true } };

const SIZES: SwitchSize[] = ["md", "sm"];

/** pen 스펙 매트릭스 — On/Off × 상태 × 사이즈 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      {([false, true] as const).map((on) => (
        <section key={String(on)} style={{ display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 12 }}>{on ? "On" : "Off"}</strong>
          {SIZES.map((size) => (
            <div key={size} style={{ display: "flex", gap: 32 }}>
              <Switch size={size} on={on} label="알림 받기" />
              <Switch size={size} on={on} disabled label="알림 받기" />
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};
