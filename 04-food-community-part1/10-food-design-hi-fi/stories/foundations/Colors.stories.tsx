import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { colorGroups, type ColorToken } from "../../lib/design-tokens";

/**
 * design.pen(variables 메뉴)에서 Pencil MCP로 핸드오프한 컬러 파운데이션.
 * 모든 색은 `app/tokens.css`의 CSS 커스텀 프로퍼티로 제공되며,
 * Dark 값이 있는 토큰은 `.dark` 클래스에서 자동으로 전환된다.
 */
const meta = {
  title: "Foundations/Colors",
  parameters: { layout: "padded" },
  tags: ["autodocs"],
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

function Swatch({ token }: { token: ColorToken }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 10px",
        border: "1px solid var(--border-subtle)",
        borderRadius: 12,
        background: "var(--bg-page)",
      }}
    >
      <div style={{ display: "flex" }}>
        <div
          title={`Light ${token.light}`}
          style={{
            width: 44,
            height: 44,
            borderRadius: token.dark ? "10px 0 0 10px" : 10,
            background: token.light,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
        {token.dark && (
          <div
            title={`Dark ${token.dark}`}
            style={{
              width: 22,
              height: 44,
              borderRadius: "0 10px 10px 0",
              background: token.dark,
              borderTop: "1px solid rgba(0,0,0,0.08)",
              borderRight: "1px solid rgba(0,0,0,0.08)",
              borderBottom: "1px solid rgba(0,0,0,0.08)",
            }}
          />
        )}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {token.name}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)" }}>
          <code>{token.cssVar}</code> · {token.light}
          {token.dark ? ` / ${token.dark}` : ""}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-tertiary)" }}>{token.desc}</div>
      </div>
    </div>
  );
}

export const Palette: Story = {
  render: () => (
    <div style={{ fontFamily: "var(--font-body), sans-serif", display: "grid", gap: 28 }}>
      {colorGroups.map((group) => (
        <section key={group.title}>
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 16,
              fontWeight: 800,
              color: "var(--text-primary)",
            }}
          >
            {group.title}
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
              gap: 10,
            }}
          >
            {group.tokens.map((token) => (
              <Swatch key={token.name} token={token} />
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

/** 시맨틱 토큰의 Light/Dark 전환 미리보기 */
export const DarkMode: Story = {
  render: () => {
    const sample = colorGroups
      .flatMap((g) => g.tokens)
      .filter((t) => t.dark)
      .slice(0, 12);
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {(["light", "dark"] as const).map((mode) => (
          <div
            key={mode}
            className={mode === "dark" ? "dark" : undefined}
            style={{
              padding: 16,
              borderRadius: 16,
              background: "var(--background)",
              border: "1px solid var(--border)",
              display: "grid",
              gap: 8,
            }}
          >
            <strong style={{ color: "var(--foreground)", fontSize: 13 }}>
              {mode === "light" ? "Light" : "Dark"}
            </strong>
            {sample.map((t) => (
              <div key={t.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: 6,
                    background: `var(${t.cssVar})`,
                    border: "1px solid rgba(128,128,128,0.3)",
                  }}
                />
                <code style={{ fontSize: 11, color: "var(--muted-foreground)" }}>{t.cssVar}</code>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  },
};
