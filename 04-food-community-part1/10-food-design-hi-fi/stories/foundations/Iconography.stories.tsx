import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { iconSizes } from "../../lib/design-tokens";
import { dsIcons, iconNames } from "../../lib/icons";

/**
 * design.pen에서 핸드오프한 아이코노그래피 파운데이션.
 * 디자인의 아이콘 노드는 lucide 라이브러리 기반이므로 `lucide-react`로 1:1 매핑했다.
 * 사이즈 스케일: 16 / 20 / 24 / 32.
 */
const meta = {
  title: "Foundations/Iconography",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

export const Grid: Story = {
  render: () => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(132px, 1fr))",
        gap: 10,
        fontFamily: "var(--font-body), sans-serif",
      }}
    >
      {iconNames.map((name) => {
        const { lucideId, Component } = dsIcons[name];
        return (
          <div
            key={name}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              padding: "16px 8px 12px",
              border: "1px solid var(--border-subtle)",
              borderRadius: 12,
              color: "var(--text-primary)",
            }}
          >
            <Component size={24} strokeWidth={2} aria-label={name} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{name}</div>
              {lucideId !== name && (
                <div style={{ fontSize: 10, color: "var(--text-tertiary)" }}>
                  lucide: {lucideId}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 12, fontFamily: "var(--font-body), sans-serif" }}>
      {(["home", "search", "bookmark", "user", "plus"] as const).map((name) => {
        const { Component } = dsIcons[name];
        return (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <code style={{ width: 90, fontSize: 12, color: "var(--text-secondary)" }}>{name}</code>
            {iconSizes.map((size) => (
              <div
                key={size}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                  color: "var(--text-primary)",
                }}
              >
                <Component size={size} strokeWidth={2} />
                <span style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{size}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  ),
};

/** 실제 사용 맥락 — 액센트/보조 색 토큰과 함께 */
export const WithColors: Story = {
  render: () => (
    <div style={{ display: "flex", gap: 16, fontFamily: "var(--font-body), sans-serif" }}>
      {(
        [
          ["--pink-500", "액센트 (활성 탭·포인트)"],
          ["--text-primary", "기본"],
          ["--text-secondary", "보조"],
          ["--text-tertiary", "비활성·플레이스홀더"],
        ] as const
      ).map(([cssVar, label]) => (
        <div
          key={cssVar}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
            padding: 16,
            border: "1px solid var(--border-subtle)",
            borderRadius: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, color: `var(${cssVar})` }}>
            <dsIcons.heart.Component size={24} />
            <dsIcons.bookmark.Component size={24} />
            <dsIcons.home.Component size={24} />
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
            <code>{cssVar}</code>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{label}</div>
        </div>
      ))}
    </div>
  ),
};
