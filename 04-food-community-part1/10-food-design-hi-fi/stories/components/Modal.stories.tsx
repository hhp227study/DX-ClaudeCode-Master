import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Modal } from "../../components/ui/modal";

/** design.pen `Components/Modal` 핸드오프. 스크림 탭 시 닫힘. */
const meta = {
  title: "Components/Modal",
  component: Modal,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    title: "글을 삭제할까요?",
    children: "삭제한 글은 복구할 수 없어요. 등록한 사진과 내용이 함께 삭제됩니다.",
    cancelLabel: "취소",
    confirmLabel: "삭제",
    destructive: true,
  },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DeleteConfirm: Story = {};

export const Default: Story = {
  args: {
    title: "위치 권한이 필요해요",
    children: "가까운 맛집을 추천하려면 위치 접근 권한이 필요합니다. 허용하시겠어요?",
    cancelLabel: "나중에",
    confirmLabel: "허용",
    destructive: false,
  },
};

/** pen scrim-demo 재현 — 스크림 위 중앙 배치 */
export const WithScrim: Story = {
  render: (args) => (
    <div
      style={{
        position: "relative",
        width: 360,
        height: 300,
        borderRadius: 12,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "var(--black)",
          opacity: 0.4,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Modal {...args} />
      </div>
    </div>
  ),
};
