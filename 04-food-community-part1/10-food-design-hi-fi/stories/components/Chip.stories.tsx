import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Chip, type ChipSize } from "../../components/ui/chip";
import { iconNames } from "../../lib/icons";

/**
 * design.pen `Components/Chip` 핸드오프.
 * Unselected/Selected × Default/Disabled × md(32)/sm(24), 좌측 아이콘 옵션.
 */
const meta = {
  title: "Components/Chip",
  component: Chip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { children: "전체", selected: false, disabled: false, size: "md" },
  argTypes: {
    size: { control: "select", options: ["md", "sm"] },
    leadIcon: { control: "select", options: [undefined, ...iconNames] },
  },
} satisfies Meta<typeof Chip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unselected: Story = {};
export const Selected: Story = { args: { selected: true } };
export const Disabled: Story = { args: { disabled: true } };
export const WithIcon: Story = { args: { leadIcon: "search", children: "검색" } };

const SIZES: ChipSize[] = ["md", "sm"];

/** pen 스펙 매트릭스 — 선택 상태 × 상태 × 사이즈 + 아이콘 변형 */
export const Matrix: Story = {
  parameters: { layout: "padded" },
  render: () => (
    <div style={{ display: "grid", gap: 20 }}>
      {SIZES.map((size) => (
        <div key={size} style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Chip size={size}>전체</Chip>
          <Chip size={size} disabled>
            전체
          </Chip>
          <Chip size={size} selected>
            전체
          </Chip>
          <Chip size={size} selected disabled>
            전체
          </Chip>
          <Chip size={size} leadIcon="search">
            검색
          </Chip>
        </div>
      ))}
    </div>
  ),
};

/** 필터 그룹 사용 예 — 즐겨찾기 페이지의 카테고리 필터 */
export const FilterGroup: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 8 }}>
      <Chip selected>전체</Chip>
      <Chip>한식</Chip>
      <Chip>카페</Chip>
      <Chip>양식</Chip>
    </div>
  ),
};
