import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox, type CheckboxSize, type CheckboxState } from "../../components/ui/checkbox";

/**
 * design.pen `Components/Checkbox` 핸드오프.
 * Unchecked/Checked/Indeterminate × Default/Disabled/Error × md(20)/sm(16).
 */
const meta = {
  title: "Components/Checkbox",
  component: Checkbox,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { label: "주차 가능", checked: false, state: "default", size: "md" },
  argTypes: {
    state: { control: "select", options: ["default", "disabled", "error"] },
    size: { control: "select", options: ["md", "sm"] },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};
export const Checked: Story = { args: { checked: true } };
export const Indeterminate: Story = { args: { indeterminate: true } };
export const Disabled: Story = { args: { checked: true, state: "disabled" } };
export const ErrorState: Story = { args: { checked: true, state: "error" } };

const STATES: CheckboxState[] = ["default", "disabled", "error"];
const SIZES: CheckboxSize[] = ["md", "sm"];

/** pen 스펙 매트릭스 — 체크 상태 × 상태 × 사이즈 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      {(["unchecked", "checked", "indeterminate"] as const).map((kind) => (
        <section key={kind} style={{ display: "grid", gap: 10 }}>
          <strong style={{ fontSize: 12, textTransform: "capitalize" }}>{kind}</strong>
          {SIZES.map((size) => (
            <div key={size} style={{ display: "flex", gap: 32 }}>
              {STATES.map((state) => (
                <Checkbox
                  key={state}
                  size={size}
                  state={state}
                  checked={kind === "checked"}
                  indeterminate={kind === "indeterminate"}
                  label="주차 가능"
                />
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  ),
};

/** 그룹 사용 예 — 에러 메시지는 그룹당 1회 */
export const GroupError: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 8 }}>
      <Checkbox checked state="error" label="이용약관 동의" />
      <Checkbox state="error" label="개인정보 수집 동의" />
      <Checkbox state="error" label="위치정보 이용 동의" />
      <span
        style={{
          fontFamily: "var(--font-body), sans-serif",
          fontSize: 12,
          letterSpacing: -0.24,
          color: "var(--destructive)",
        }}
      >
        필수 항목에 모두 동의해주세요
      </span>
    </div>
  ),
};
