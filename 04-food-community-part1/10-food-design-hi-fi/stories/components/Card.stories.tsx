import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Card } from "../../components/ui/card";

/** design.pen `Components/Card` 핸드오프. 기본(이미지 영역) / no-image 변형. */
const meta = {
  title: "Components/Card",
  component: Card,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    title: "할머니 손칼국수",
    description: "골목 안쪽에 숨어있는 진한 멸치 육수 칼국수집",
  },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoImage: Story = { args: { image: false } };

/** 이미지 노드를 넘기면 플레이스홀더를 대체한다 */
export const WithImage: Story = {
  args: {
    image: (
      <div
        style={{
          width: "100%",
          height: "100%",
          background:
            "linear-gradient(115deg, var(--pink-500), var(--pink-200))",
        }}
      />
    ),
  },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
      <Card
        title="할머니 손칼국수"
        description="골목 안쪽에 숨어있는 진한 멸치 육수 칼국수집"
      />
      <Card
        title="골목 안 로스터리"
        description="직접 로스팅한 원두로 내리는 조용한 골목 카페"
        image={false}
      />
    </div>
  ),
};
