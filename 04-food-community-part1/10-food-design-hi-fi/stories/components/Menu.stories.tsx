import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Menu, MenuItem, type MenuItemSize } from "../../components/ui/menu";

/** design.pen `Components/Menu` + `MenuItem` 핸드오프. 데스크톱은 트리거 아래, 모바일은 바텀시트 안에. */
const meta = {
  title: "Components/Menu",
  component: Menu,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    children: (
      <>
        <MenuItem icon="edit">수정하기</MenuItem>
        <MenuItem icon="share">공유하기</MenuItem>
        <MenuItem destructive>삭제하기</MenuItem>
      </>
    ),
  },
} satisfies Meta<typeof Menu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** pen desktop-demo 재현 — 수정/공유/삭제 */
export const Default: Story = {
  render: () => (
    <Menu width={220}>
      <MenuItem icon="edit">수정하기</MenuItem>
      <MenuItem icon="share">공유하기</MenuItem>
      <MenuItem destructive>삭제하기</MenuItem>
    </Menu>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Menu width={220}>
      <MenuItem icon="edit">수정하기</MenuItem>
      <MenuItem icon="share" disabled>
        공유하기
      </MenuItem>
      <MenuItem destructive disabled>
        삭제하기
      </MenuItem>
    </Menu>
  ),
};

/** MenuItem 매트릭스 — Default/Destructive × 상태 × lg/md/sm */
export const ItemMatrix: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {(["lg", "md", "sm"] as MenuItemSize[]).map((size) => (
        <div key={size} style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <MenuItem size={size} style={{ width: 150 }}>
            수정하기
          </MenuItem>
          <MenuItem size={size} disabled style={{ width: 150 }}>
            수정하기
          </MenuItem>
          <MenuItem size={size} destructive style={{ width: 150 }}>
            삭제하기
          </MenuItem>
          <MenuItem size={size} destructive disabled style={{ width: 150 }}>
            삭제하기
          </MenuItem>
        </div>
      ))}
    </div>
  ),
};
