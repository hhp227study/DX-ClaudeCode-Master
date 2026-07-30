import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { TextArea, type TextAreaState } from "../../components/ui/text-area";

/**
 * design.pen `Components/TextArea` 핸드오프.
 * Default/Focused/Disabled/Error, 헬퍼 + 카운터 행 포함.
 */
const meta = {
  title: "Components/TextArea",
  component: TextArea,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    label: "맛집 내용",
    placeholder: "어떤 점이 좋았는지 알려주세요",
    helper: "10자 이상 입력해주세요",
    counter: "0/200",
    state: "default",
  },
  argTypes: {
    state: { control: "select", options: ["default", "focused", "disabled", "error"] },
  },
} satisfies Meta<typeof TextArea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Focused: Story = {
  args: {
    state: "focused",
    value: "골목 안쪽에 숨어있어서 아는 사람만 가는 칼국수집이에요.",
    counter: "31/200",
  },
};
export const Disabled: Story = { args: { state: "disabled" } };
export const Error: Story = {
  args: { state: "error", value: "맛있음", helper: "10자 이상 입력해주세요", counter: "3/200" },
};

const STATES: TextAreaState[] = ["default", "focused", "disabled", "error"];

/** pen 스펙 매트릭스 — 상태 4종 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
      {STATES.map((state) => (
        <TextArea
          key={state}
          state={state}
          label="맛집 내용"
          placeholder="어떤 점이 좋았는지 알려주세요"
          value={
            state === "focused"
              ? "골목 안쪽에 숨어있어서 아는 사람만 가는 칼국수집이에요."
              : state === "error"
                ? "맛있음"
                : undefined
          }
          helper={state === "error" ? "10자 이상 입력해주세요" : "도움말 텍스트"}
          counter={state === "focused" ? "31/200" : state === "error" ? "3/200" : "0/200"}
        />
      ))}
    </div>
  ),
};
