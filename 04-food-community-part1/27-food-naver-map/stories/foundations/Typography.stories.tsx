import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fonts, typography } from "../../lib/design-tokens";

/**
 * design.pen에서 핸드오프한 타이포그래피 파운데이션.
 * - 브랜드: Black Han Sans (`--font-brand`) — 로고·히어로 전용
 * - 본문: Noto Sans KR (`--font-body`) — UI 전반
 * - 공통 자간 -2%, 역할별 클래스는 `app/tokens.css`의 `.typo-*`로 제공.
 */
const meta = {
  title: "Foundations/Typography",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const SAMPLE = "동네 이웃이 찾은 숨은 맛집 12곳";

export const Families: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 16 }}>
      {Object.values(fonts).map((font) => (
        <div
          key={font.name}
          style={{
            padding: 20,
            border: "1px solid var(--border-subtle)",
            borderRadius: 16,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {font.name} · <code>{font.cssVar}</code> · {font.usage}
          </div>
          <div
            style={{
              fontFamily: `var(${font.cssVar})`,
              fontSize: 28,
              color: "var(--text-primary)",
            }}
          >
            숨은맛집 — 가나다라마바사 ABC abc 123
          </div>
        </div>
      ))}
    </div>
  ),
};

export const Scale: Story = {
  render: () => (
    <div style={{ display: "grid", gap: 4 }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "110px 200px 1fr",
          gap: 12,
          padding: "6px 10px",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-tertiary)",
          fontFamily: "var(--font-body), sans-serif",
        }}
      >
        <span>역할</span>
        <span>스펙</span>
        <span>미리보기 (.typo-*)</span>
      </div>
      {typography.map((t) => (
        <div
          key={t.role}
          style={{
            display: "grid",
            gridTemplateColumns: "110px 200px 1fr",
            gap: 12,
            alignItems: "center",
            padding: "10px",
            borderTop: "1px solid var(--border-subtle)",
            fontFamily: "var(--font-body), sans-serif",
          }}
        >
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              {t.role}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{t.usage}</div>
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            {t.family === "brand" ? "Black Han Sans" : "Noto Sans KR"} · {t.size}px ·{" "}
            {t.weight} · lh {t.lineHeight} · ls -2%
          </div>
          <div className={`typo-${t.role}`} style={{ color: "var(--text-primary)" }}>
            {SAMPLE}
          </div>
        </div>
      ))}
    </div>
  ),
};
