// design.pen Components/TopNavigation 핸드오프.
// 변형: default (좌우 아이콘 버튼) / title-only
import type { CSSProperties } from "react";
import type { DsIconName } from "@/lib/icons";
import { IconButton } from "./icon-button";

export type TopNavigationVariant = "default" | "title-only";

export type TopNavigationProps = {
  title: string;
  variant?: TopNavigationVariant;
  leftIcon?: DsIconName;
  rightIcon?: DsIconName;
  onLeft?: () => void;
  onRight?: () => void;
  style?: CSSProperties;
};

const titleStyle: CSSProperties = {
  fontFamily: "var(--font-body), sans-serif",
  fontSize: 16,
  fontWeight: 600,
  lineHeight: 1.2,
  letterSpacing: -0.32,
  color: "var(--foreground)",
};

export function TopNavigation({
  title,
  variant = "default",
  leftIcon = "chevron-left",
  rightIcon = "more-vertical",
  onLeft,
  onRight,
  style,
}: TopNavigationProps) {
  const base: CSSProperties = {
    display: "flex",
    alignItems: "center",
    width: "100%",
    height: 56,
    padding: 4,
    background: "var(--card)",
    borderBottom: "1px solid var(--border)",
    boxSizing: "border-box",
    ...style,
  };

  if (variant === "title-only") {
    return (
      <div style={{ ...base, justifyContent: "center" }}>
        <span style={titleStyle}>{title}</span>
      </div>
    );
  }

  return (
    <div style={{ ...base, justifyContent: "space-between" }}>
      <IconButton variant="ghost" icon={leftIcon} onClick={onLeft} />
      <span style={titleStyle}>{title}</span>
      <IconButton variant="ghost" icon={rightIcon} onClick={onRight} />
    </div>
  );
}
