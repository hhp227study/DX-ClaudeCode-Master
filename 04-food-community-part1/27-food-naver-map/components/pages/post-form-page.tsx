// design.pen 등록페이지-에러 / 수정페이지 핸드오프 — 등록·수정 공용 폼 페이지
import type { CSSProperties } from "react";
import { StatusBar } from "../app/status-bar";
import { Button } from "../ui/button";
import { Dropzone, FileItem } from "../ui/file-uploader";
import { Icon } from "../ui/icon";
import { TextArea } from "../ui/text-area";
import { TextField } from "../ui/text-field";
import { Toast } from "../ui/toast";
import { TopNavigation } from "../ui/top-navigation";

export type PostFormPageProps = {
  /** register: 신규 등록, edit: 기존 값이 채워진 수정 폼 */
  mode?: "register" | "edit";
  /** 등록 검증 실패 상태 (필수 항목 에러) */
  error?: boolean;
  style?: CSSProperties;
};

export function PostFormPage({ mode = "register", error = false, style }: PostFormPageProps) {
  const isEdit = mode === "edit";
  const fieldState = error ? "error" : "default";
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: 360,
        minHeight: 780,
        background: "var(--bg-page)",
        fontFamily: "var(--font-body), sans-serif",
        ...style,
      }}
    >
      <StatusBar />
      <TopNavigation title={isEdit ? "맛집 수정" : "맛집 등록"} />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          padding: "20px 16px 24px 16px",
        }}
      >
        {error && <Toast status="error" message="필수 항목 3곳을 확인해주세요" fullWidth />}

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              사진
            </span>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-tertiary)" }}>
              {isEdit ? "2 / 5" : "1 / 5"}
            </span>
          </div>
          <Dropzone
            state="default"
            guideText="사진을 여기에 끌어다 놓아주세요"
            browseLabel="파일 선택"
            fullWidth
          />
          <FileItem
            status="complete"
            fileName={isEdit ? "kalguksu_01.jpg" : "photo_01.jpg"}
            statusText="업로드 완료"
            fullWidth
          />
          {isEdit && (
            <FileItem status="complete" fileName="kalguksu_02.jpg" statusText="업로드 완료" fullWidth />
          )}
        </section>

        <TextField
          label="맛집 이름 *"
          state={fieldState}
          leadIcon="edit"
          placeholder="예: 할머니 손칼국수"
          value={isEdit ? "할머니 손칼국수" : undefined}
          helper={isEdit ? "실제 가게 이름으로 등록해주세요" : "맛집 이름을 입력해주세요"}
          fullWidth
        />

        <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <TextField
              label="맛집 주소 *"
              state={fieldState}
              leadIcon="search"
              placeholder="주소 검색"
              value={isEdit ? "서울 구로구 개봉로 12" : undefined}
              helper={isEdit ? "지도에서 위치를 확인해주세요" : "주소를 검색해 선택해주세요"}
              fullWidth
              style={{ flex: 1, minWidth: 0 }}
            />
            <Button variant="primary" leadIcon="search">
              검색
            </Button>
          </div>
          {isEdit ? (
            <img
              src="/images/map.svg"
              alt="맛집 위치 지도"
              style={{
                display: "block",
                width: "100%",
                height: 140,
                borderRadius: 12,
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                height: 120,
                borderRadius: 12,
                background: "var(--bg-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Icon name="image" size={24} color="var(--text-tertiary)" />
              <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>
                주소를 선택하면 지도가 표시돼요
              </span>
            </div>
          )}
        </section>

        <TextArea
          label="맛집 내용 *"
          state={fieldState}
          value={
            isEdit
              ? "골목 안쪽에 숨어있어서 아는 사람만 가는 칼국수집이에요. 멸치 육수가 진하고 면발이 쫄깃합니다."
              : "맛있음"
          }
          helper="10자 이상 입력해주세요"
          counter={isEdit ? "58/200" : "3/200"}
          fullWidth
        />
      </div>

      <div
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "12px 16px 16px 16px",
          background: "var(--bg-page)",
        }}
      >
        {isEdit ? (
          <Button variant="primary" leadIcon="check" fullWidth>
            수정 완료
          </Button>
        ) : (
          <Button variant="primary" disabled fullWidth>
            맛집 등록하기
          </Button>
        )}
      </div>
    </div>
  );
}
