import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Toast, type ToastStatus } from "../../components/ui/toast";

/** design.pen `Components/Toast` 핸드오프. 4개 상태 + 모바일·no-close 변형. */
const meta = {
  title: "Components/Toast",
  component: Toast,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { status: "info", message: "새 버전이 있어요", closable: true },
  argTypes: {
    status: { control: "select", options: ["success", "error", "info", "warning"] },
  },
} satisfies Meta<typeof Toast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Info: Story = {};
export const Success: Story = { args: { status: "success", message: "맛집이 저장됐어요!" } };
export const Error: Story = {
  args: { status: "error", message: "필수 항목 3곳을 확인해주세요" },
};
export const Warning: Story = {
  args: { status: "warning", message: "사진 용량이 거의 다 찼어요" },
};

/** pen 매트릭스 — 상태 4종 */
export const AllStatuses: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12 }}>
      {(
        [
          ["success", "맛집이 저장됐어요!"],
          ["error", "문제가 발생했어요. 다시 시도해주세요"],
          ["info", "새 버전이 있어요"],
          ["warning", "사진 용량이 거의 다 찼어요"],
        ] as [ToastStatus, string][]
      ).map(([status, message]) => (
        <Toast key={status} status={status} message={message} />
      ))}
    </div>
  ),
};

/** 모바일 — 화면 폭(360 - 좌우 16) 기준 */
export const Mobile: Story = {
  render: () => (
    <div style={{ width: 328 }}>
      <Toast status="info" message="새 버전이 있어요" fullWidth />
    </div>
  ),
};

export const NoClose: Story = {
  args: { message: "새 버전이 있어요", closable: false },
};
