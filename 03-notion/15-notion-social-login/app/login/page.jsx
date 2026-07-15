"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

export default function LoginPage() {
  const { ready, user, login } = useStore();
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/");
  }, [ready, user, router]);

  if (!ready || user) return <div className="boot" />;

  const onGoogleLogin = async () => {
    setPending(true);
    setError("");
    const msg = await login();
    if (msg) {
      setError(msg);
      setPending(false);
    }
  };

  return (
    <div className="login-wrap">
      <span
        className="brand-tile"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          fontSize: 20,
          marginBottom: 20,
        }}
      >
        미
      </span>
      <div className="login-title">미니 노션</div>
      <div className="login-sub">
        나만의 가벼운 업무 관리 도구.
        <br />
        구글 계정으로 바로 시작하세요.
      </div>
      <button
        className="btn gho login-google"
        onClick={onGoogleLogin}
        disabled={pending}
      >
        <span className="g-mark">G</span>
        {pending ? "구글로 이동 중…" : "구글로 로그인"}
      </button>
      {error && (
        <div className="f-error" style={{ marginTop: 10 }}>
          {error}
        </div>
      )}
      <div className="login-note">별도 회원가입 없이 로그인됩니다.</div>
    </div>
  );
}
