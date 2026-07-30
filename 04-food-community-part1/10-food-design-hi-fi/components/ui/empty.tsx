// design.pen Components/Empty 핸드오프. 컨테이너 중앙 배치용 빈 상태.
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { Button } from "./button";
import { Icon } from "./icon";

export type EmptyAction = { label: string; onClick?: () => void };

export type EmptyProps = {
  icon?: DsIconName;
  title: string;
  description?: string;
  secondaryAction?: EmptyAction;
  primaryAction?: EmptyAction;
  style?: CSSProperties;
};

export function Empty({
  icon = "search",
  title,
  description,
  secondaryAction,
  primaryAction,
  style,
}: EmptyProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-pill)",
          background: "var(--muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={icon} size={32} color="var(--muted-foreground)" />
      </div>
      <div
        style={{
          fontSize: 16,
          fontWeight: 600,
          lineHeight: 1.2,
          letterSpacing: -0.32,
          color: "var(--foreground)",
        }}
      >
        {title}
      </div>
      {description && (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.4,
            letterSpacing: -0.28,
            color: "var(--muted-foreground)",
            textAlign: "center",
            whiteSpace: "pre-line",
          }}
        >
          {description}
        </div>
      )}
      {(secondaryAction || primaryAction) && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
          {secondaryAction && (
            <Button variant="secondary" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
          {primaryAction && (
            <Button variant="primary" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
