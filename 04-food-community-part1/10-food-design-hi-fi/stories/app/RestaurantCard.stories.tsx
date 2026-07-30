import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { RestaurantCard } from "../../components/app/restaurant-card";
import { StatusBar } from "../../components/app/status-bar";

/** design.pen `component/RestaurantCard` — 목록·즐겨찾기·마이페이지에서 쓰는 앱 전용 카드. */
const meta = {
  title: "App/RestaurantCard",
  component: RestaurantCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: {
    photoUrl:
      "https://images.unsplash.com/photo-1775883374700-bddbb6c80fcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400",
    tag: "한식",
    name: "할머니 손칼국수",
    address: "구로구 개봉로 12",
    meta: "김구로 · 2일 전",
  },
  decorators: [
    (Story) => (
      <div style={{ width: 328 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RestaurantCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const NoPhoto: Story = { args: { photoUrl: undefined } };
export const LongName: Story = {
  args: {
    name: "아주아주 길어서 줄임표가 필요한 숨은 맛집 이름",
    address: "서울특별시 구로구 개봉로 12길 34-5 지하 1층",
  },
};

export const List: Story = {
  render: (args) => (
    <div style={{ display: "grid", gap: 12 }}>
      <RestaurantCard {...args} />
      <RestaurantCard
        {...args}
        tag="카페"
        name="골목 안 로스터리"
        address="광명시 하안로 45"
        meta="이주말 · 4일 전"
        photoUrl="https://images.unsplash.com/photo-1623659228341-21bc94462e9f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
      />
      <RestaurantCard
        {...args}
        tag="양식"
        name="숲속 파스타집"
        address="부천시 원미로 88"
        meta="박커플 · 6일 전"
        photoUrl="https://images.unsplash.com/photo-1669880210910-57960a74e1db?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400"
      />
    </div>
  ),
};

export const WithStatusBar: Story = {
  render: (args) => (
    <div style={{ width: 360, border: "1px solid var(--border-subtle)", borderRadius: 12 }}>
      <StatusBar />
      <div style={{ padding: 16 }}>
        <RestaurantCard {...args} />
      </div>
    </div>
  ),
};
