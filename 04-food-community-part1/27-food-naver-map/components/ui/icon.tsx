// design.pen icon 노드(lucide 기반)의 React 구현. 매핑은 lib/icons.ts 참조.
import { dsIcons, type DsIconName } from "@/lib/icons";

export type IconSize = 16 | 20 | 24 | 32;

export type IconProps = {
  name: DsIconName;
  /** 디자인 시스템 아이콘 사이즈 스케일은 16/20/24/32. 컴포넌트 내부 글리프는 예외적으로 자유 크기 허용 */
  size?: IconSize | number;
  /** CSS 색상 값 (토큰: "var(--...)") */
  color?: string;
  strokeWidth?: number;
  className?: string;
};

export function Icon({
  name,
  size = 24,
  color = "currentColor",
  strokeWidth = 2,
  className,
}: IconProps) {
  const { Component } = dsIcons[name];
  return (
    <Component
      size={size}
      color={color}
      strokeWidth={strokeWidth}
      className={className}
      aria-hidden
    />
  );
}
