"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useStore } from "@/lib/store";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

function ProfileForm() {
  const { user, updateUser, logout } = useStore();
  const router = useRouter();
  const fileRef = useRef(null);
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [imgError, setImgError] = useState("");

  useEffect(() => {
    if (!saved) return;
    const t = setTimeout(() => setSaved(false), 2000);
    return () => clearTimeout(t);
  }, [saved]);

  // profile이 늦게 로드되면 입력값을 DB 값으로 동기화
  useEffect(() => {
    setName(user.name);
  }, [user.name]);

  const onPickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setImgError("JPG 또는 PNG 파일만 올릴 수 있습니다.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImgError("이미지가 2MB를 넘습니다. 더 작은 파일을 선택해 주세요.");
      return;
    }
    setImgError("");
    const reader = new FileReader();
    reader.onload = () => updateUser({ avatar: reader.result });
    reader.readAsDataURL(file);
  };

  const onSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(user.name);
      return;
    }
    setSaving(true);
    setNameError("");
    const msg = await updateUser({ name: trimmed });
    setSaving(false);
    if (msg) {
      setNameError(msg);
      return;
    }
    setSaved(true);
  };

  const onLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-head">
        <h1 className="h1">마이 페이지</h1>
      </div>

      <div className="f-row">
        <div className="f-label">프로필 이미지</div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="profile-ava">
            {user.avatar ? (
              <img src={user.avatar} alt="프로필 이미지" />
            ) : (
              user.name.slice(0, 1)
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn gho" onClick={() => fileRef.current?.click()}>
                이미지 변경
              </button>
              {user.avatar && (
                <button className="btn gho" onClick={() => updateUser({ avatar: null })}>
                  제거
                </button>
              )}
            </div>
            {imgError ? (
              <span className="f-error">{imgError}</span>
            ) : (
              <span className="f-hint">JPG·PNG, 최대 2MB</span>
            )}
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png"
          style={{ display: "none" }}
          onChange={onPickImage}
        />
      </div>

      <div className="f-row">
        <div className="f-label">별명</div>
        <div style={{ display: "flex", gap: 9, maxWidth: 340, alignItems: "center" }}>
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSaveName()}
            placeholder="별명을 입력하세요"
          />
          <button
            className="btn pri"
            style={{ height: 38, flex: "none" }}
            onClick={onSaveName}
            disabled={saving}
          >
            {saving ? "저장 중…" : "저장"}
          </button>
        </div>
        {saved && (
          <div className="saved-msg" style={{ marginTop: 8 }}>
            저장되었습니다 ✓
          </div>
        )}
        {nameError && (
          <div className="f-error" style={{ marginTop: 8 }}>
            {nameError}
          </div>
        )}
      </div>

      <div className="f-row">
        <div className="f-label">계정</div>
        <button className="btn gho" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AppShell>
      <ProfileForm />
    </AppShell>
  );
}
