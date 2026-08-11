"use client";
// 프로필 수정 폼 — SSOT 컴포넌트(TextField/Dropzone/FileItem/Toast/Button)를 실입력으로 감싸
// BFF PATCH /api/profile 로 저장한다. 이미지는 선택 시 즉시 미리보기, 저장 시에만 업로드된다.
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dropzone, FileItem } from "@/components/ui/file-uploader";
import { TextField } from "@/components/ui/text-field";
import { Toast } from "@/components/ui/toast";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NICKNAME_LENGTH = 20;

export type ProfileEditFormProps = {
  initialNickname: string;
  initialImageUrl: string | null;
};

export function ProfileEditForm({ initialNickname, initialImageUrl }: ProfileEditFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nickname, setNickname] = useState(initialNickname);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dragover, setDragover] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = nickname.trim();
  const nicknameInvalid = trimmed.length === 0 || trimmed.length > MAX_NICKNAME_LENGTH;
  const avatarUrl = previewUrl ?? initialImageUrl;

  const selectFile = (next: File | null | undefined) => {
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("이미지 파일만 올릴 수 있어요");
      return;
    }
    if (next.size > MAX_IMAGE_BYTES) {
      setError("이미지는 5MB 이하만 올릴 수 있어요");
      return;
    }
    setError(null);
    setFile(next);
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(next);
    });
  };

  const submit = async () => {
    setPending(true);
    setError(null);
    const body = new FormData();
    body.set("nickname", trimmed);
    if (file) body.set("image", file);
    try {
      const res = await fetch("/api/profile", { method: "PATCH", body });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError(data?.error ?? "프로필 저장에 실패했어요");
        setPending(false);
        return;
      }
      // 서버 컴포넌트(마이페이지)가 변경된 프로필을 다시 읽도록 refresh 후 이동
      router.refresh();
      router.push("/my");
    } catch {
      setError("네트워크 오류로 저장하지 못했어요");
      setPending(false);
    }
  };

  return (
    <>
      <main className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 pb-8 pt-5 md:px-6">
        <section className="flex flex-col items-center gap-2 pt-2">
          {avatarUrl ? (
            // 구글 프로필 이미지 — referrer 없이 요청해야 403이 나지 않는다
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt="프로필 이미지 미리보기"
              referrerPolicy="no-referrer"
              className="h-24 w-24 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-soft text-[36px] font-bold text-brand-strong">
              {trimmed.slice(0, 1) || "?"}
            </span>
          )}
          <span className="text-[12px] text-[var(--text-tertiary)]">
            {file ? "저장을 누르면 새 이미지가 적용돼요" : "현재 프로필 이미지"}
          </span>
        </section>

        <TextField
          label="닉네임 *"
          leadIcon="user"
          value={nickname}
          onChange={setNickname}
          state={nicknameInvalid ? "error" : "default"}
          helper={
            nicknameInvalid
              ? `닉네임은 1~${MAX_NICKNAME_LENGTH}자로 입력해주세요`
              : "이웃에게 보여질 이름이에요"
          }
          fullWidth
        />

        <section className="flex flex-col gap-2">
          <span className="text-[14px] font-bold text-[var(--text-primary)]">프로필 이미지</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              selectFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <div
            role="button"
            aria-label="프로필 이미지 선택"
            className="cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragover(true);
            }}
            onDragLeave={() => setDragover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragover(false);
              selectFile(e.dataTransfer.files?.[0]);
            }}
          >
            <Dropzone
              state={dragover ? "dragover" : "default"}
              guideText="사진을 여기에 끌어다 놓아주세요"
              browseLabel="파일 선택"
              fullWidth
            />
          </div>
          {file && <FileItem status="complete" fileName={file.name} statusText="선택 완료" fullWidth />}
        </section>

        {error && <Toast status="error" message={error} fullWidth onClose={() => setError(null)} />}
      </main>

      <div className="sticky bottom-0 border-t border-[var(--border-subtle)] bg-[var(--bg-page)]">
        <div className="mx-auto w-full max-w-[720px] px-4 pb-4 pt-3 md:px-6">
          <Button
            variant="primary"
            fullWidth
            disabled={nicknameInvalid}
            loading={pending}
            onClick={submit}
          >
            저장하기
          </Button>
        </div>
      </div>
    </>
  );
}
