import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Empty } from "../../components/ui/empty";

/** design.pen `Components/Empty` 핸드오프. 컨테이너 중앙 배치. */
const meta = {
  title: "Components/Empty",
  component: Empty,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    icon: "search",
    title: "검색 결과가 없어요",
    description: "다른 키워드로 검색해보거나\n첫 번째로 등록해보세요!",
    secondaryAction: { label: "전체 맛집 보기" },
    primaryAction: { label: "맛집 등록하기" },
  },
} satisfies Meta<typeof Empty>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoPosts: Story = {
  args: {
    icon: "edit",
    title: "아직 등록한 맛집이 없어요",
    description: "내가 아는 숨은 맛집을\n이웃에게 처음으로 소개해보세요!",
    secondaryAction: { label: "맛집 구경하기" },
    primaryAction: { label: "맛집 등록하기" },
  },
};

export const TitleOnly: Story = {
  args: {
    title: "저장한 맛집이 없어요",
    description: undefined,
    secondaryAction: undefined,
    primaryAction: undefined,
  },
};

/** pen center-demo 재현 — 높이 320 컨테이너 중앙 */
export const CenteredInContainer: Story = {
  render: (args) => (
    <div
      style={{
        width: 420,
        height: 320,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <Empty {...args} />
    </div>
  ),
};
