import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Select,
  SelectItem,
  type SelectSize,
  type SelectState,
} from "../../components/ui/select";

/**
 * design.pen `Components/Select` + `Components/SelectItem` 핸드오프.
 * Select: Default/Focused/Disabled/Error × lg/md/sm. Focused 상태에서 Panel이 열린다.
 */
const meta = {
  title: "Components/Select",
  component: Select,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    label: "카테고리",
    placeholder: "카테고리 선택",
    helper: "맛집의 종류를 골라주세요",
    state: "default",
    size: "md",
  },
  argTypes: {
    state: { control: "select", options: ["default", "focused", "disabled", "error"] },
    size: { control: "select", options: ["lg", "md", "sm"] },
  },
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Focused: Story = { args: { state: "focused" } };
export const Disabled: Story = { args: { state: "disabled" } };
export const Error: Story = { args: { state: "error", helper: "카테고리를 선택해주세요" } };
export const WithValue: Story = { args: { value: "한식" } };

/** Focused Select 아래 Panel + SelectItem 3종 (pen focused-md 데모) */
export const OpenPanel: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, width: 220 }}>
      <Select label="카테고리" placeholder="카테고리 선택" state="focused" helper="맛집의 종류를 골라주세요" />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 2,
          padding: 6,
          borderRadius: 10,
          background: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <SelectItem>한식</SelectItem>
        <SelectItem selected>카페</SelectItem>
        <SelectItem disabled>양식 (준비 중)</SelectItem>
      </div>
    </div>
  ),
};

const STATES: SelectState[] = ["default", "focused", "disabled", "error"];
const SIZES: SelectSize[] = ["lg", "md", "sm"];

/** pen 스펙 매트릭스 — 상태 × 사이즈 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {STATES.map((state) => (
            <Select
              key={state}
              size={size}
              state={state}
              label="카테고리"
              placeholder="카테고리 선택"
              helper={state === "error" ? "카테고리를 선택해주세요" : "도움말 텍스트"}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};

/** SelectItem 단독 매트릭스 — Default/Selected/Disabled × lg/md/sm */
export const Items: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ display: "flex", gap: 24 }}>
          <div style={{ width: 208 }}>
            <SelectItem size={size}>한식</SelectItem>
          </div>
          <div style={{ width: 208 }}>
            <SelectItem size={size} selected>
              한식
            </SelectItem>
          </div>
          <div style={{ width: 208 }}>
            <SelectItem size={size} disabled>
              한식
            </SelectItem>
          </div>
        </div>
      ))}
    </div>
  ),
};
