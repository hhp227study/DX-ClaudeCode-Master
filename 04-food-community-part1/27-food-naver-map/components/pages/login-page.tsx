// design.pen 로그인페이지 / 로그인페이지-에러 핸드오프
import type { CSSProperties } from "react";
import { StatusBar } from "../app/status-bar";
import { Button } from "../ui/button";
import { Toast } from "../ui/toast";

export type LoginPageProps = {
  /** 로그인 실패 토스트 노출 */
  error?: boolean;
  style?: CSSProperties;
};

export function LoginPage({ error = false, style }: LoginPageProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 360,
        minHeight: 780,
        background: "var(--bg-page)",
        fontFamily: "var(--font-body), sans-serif",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <StatusBar />
      {error && (
        <div style={{ padding: "8px 16px 0" }}>
          <Toast
            status="error"
            fullWidth
            message="로그인에 실패했어요. 잠시 후 다시 시도해주세요."
          />
        </div>
      )}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          padding: "0 32px",
        }}
      >
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 44,
            background: "var(--pink-100)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
          }}
        >
          🍽
        </div>
        <div
          style={{
            fontFamily: "var(--font-brand), sans-serif",
            fontSize: 34,
            color: "var(--text-primary)",
          }}
        >
          숨은맛집
        </div>
        <div
          style={{
            fontSize: 14,
            color: "var(--text-secondary)",
            lineHeight: 1.5,
            textAlign: "center",
            whiteSpace: "pre-line",
          }}
        >
          {"우리 동네 이웃이 알려주는\n진짜 숨은 맛집 커뮤니티"}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "8px 20px 32px",
        }}
      >
        <Button
          variant="secondary"
          fullWidth
          leadIcon="user"
          style={{
            height: 48,
            background: "var(--white)",
            border: "1px solid var(--border-strong)",
            color: "var(--text-primary)",
          }}
        >
          Google 계정으로 계속하기
        </Button>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-tertiary)",
            textAlign: "center",
          }}
        >
          로그인하면 이용약관과 개인정보 처리방침에 동의하게 돼요
        </div>
      </div>
    </div>
  );
}
