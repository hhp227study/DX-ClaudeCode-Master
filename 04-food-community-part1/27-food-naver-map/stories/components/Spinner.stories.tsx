import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Spinner } from "../../components/ui/spinner";

/** design.pen `Components/Spinner` 핸드오프. md 24 — 브랜드 컬러. */
const meta = {
  title: "Components/Spinner",
  component: Spinner,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    size: { control: "select", options: [16, 20, 24, 32] },
    color: { control: "color" },
  },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
      {([16, 20, 24, 32] as const).map((size) => (
        <div
          key={size}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-body), sans-serif",
          }}
        >
          <Spinner size={size} />
          <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{size}</span>
        </div>
      ))}
    </div>
  ),
};

/** 리스트 하단 무한스크롤 로딩 사용 예 */
export const WithLabel: Story = {
  render: () => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      <Spinner />
      <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
        맛집을 더 불러오는 중...
      </span>
    </div>
  ),
};
