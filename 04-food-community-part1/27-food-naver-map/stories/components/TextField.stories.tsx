import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  TextField,
  type TextFieldSize,
  type TextFieldState,
} from "../../components/ui/text-field";
import { iconNames } from "../../lib/icons";

/**
 * design.pen `Components/TextField` 핸드오프.
 * Text/Password × Default/Focused/Disabled/Error × lg(48)/md(40)/sm(32).
 */
const meta = {
  title: "Components/TextField",
  component: TextField,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    label: "맛집 이름",
    placeholder: "예: 할머니 손칼국수",
    helper: "실제 가게 이름으로 등록해주세요",
    state: "default",
    size: "md",
    leadIcon: "search",
  },
  argTypes: {
    state: { control: "select", options: ["default", "focused", "disabled", "error"] },
    size: { control: "select", options: ["lg", "md", "sm"] },
    type: { control: "select", options: ["text", "password"] },
    leadIcon: { control: "select", options: [undefined, ...iconNames] },
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Focused: Story = { args: { state: "focused", value: "할머니 손칼국수" } };
export const Disabled: Story = { args: { state: "disabled" } };
export const Error: Story = {
  args: { state: "error", value: "맛", helper: "두 글자 이상 입력해주세요" },
};
export const Password: Story = {
  args: { type: "password", label: "비밀번호", placeholder: "비밀번호", value: "food1234", leadIcon: undefined },
};

const STATES: TextFieldState[] = ["default", "focused", "disabled", "error"];
const SIZES: TextFieldSize[] = ["lg", "md", "sm"];

/** pen 스펙 매트릭스 — 상태 × 사이즈 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 24 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          {STATES.map((state) => (
            <TextField
              key={state}
              size={size}
              state={state}
              label="맛집 이름"
              leadIcon="search"
              placeholder="예: 할머니 손칼국수"
              value={state === "focused" || state === "error" ? "할머니 손칼국수" : undefined}
              helper={state === "error" ? "맛집 이름을 입력해주세요" : "도움말 텍스트"}
            />
          ))}
        </div>
      ))}
    </div>
  ),
};
