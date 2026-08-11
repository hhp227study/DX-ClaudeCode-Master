import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Radio, type RadioSize } from "../../components/ui/radio";

/**
 * design.pen `Components/Radio` 핸드오프.
 * Unselected/Selected × Default/Disabled × md(20)/sm(16). 단독 사용 금지 — 그룹으로 사용.
 */
const meta = {
  title: "Components/Radio",
  component: Radio,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { label: "한식", selected: false, disabled: false, size: "md" },
  argTypes: {
    size: { control: "select", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Radio>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Disabled: Story = { args: { selected: true, disabled: true } };

const SIZES: RadioSize[] = ["md", "sm"];

/** pen 스펙 매트릭스 — 선택 상태 × 상태 × 사이즈 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      {([false, true] as const).map((selected) => (
        <section key={String(selected)} style={{ display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 12 }}>{selected ? "Selected" : "Unselected"}</strong>
          {SIZES.map((size) => (
            <div key={size} style={{ display: "flex", gap: 32 }}>
              <Radio size={size} selected={selected} label="한식" />
              <Radio size={size} selected={selected} disabled label="한식" />
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};

/** 그룹 사용 예 */
export const Group: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <Radio selected label="한식" />
      <Radio label="카페" />
      <Radio label="양식" />
      <Radio disabled label="일식 (준비 중)" />
    </div>
  ),
};
