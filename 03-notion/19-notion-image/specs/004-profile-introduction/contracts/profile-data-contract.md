# Contract: 자기소개 데이터 액세스 & 스토어 인터페이스

**Date**: 2026-07-16 | **Plan**: [../plan.md](../plan.md) | **Data Model**: [../data-model.md](../data-model.md)

이 앱은 자체 API 서버가 없다. 인터페이스 경계는 두 곳이다:
① UI ↔ 스토어(`useStore()`), ② 스토어 ↔ Supabase PostgREST(`profile` 테이블).

## ① 스토어 계약 — `useStore()`

### 조회

```
user: {
  name: string,              // 기존 — 변경 없음
  avatar: string | null,     // 기존 — 변경 없음
  introduction: string,      // 신규 — DB의 introduction, null이면 "" 로 노출
}
```

- `introduction`은 항상 문자열(undefined/null 노출 금지) — UI가 제어 컴포넌트 value로 바로 사용.
- profile 미로드 시점에는 `""` → 로드 완료 시 실제 값으로 갱신됨(구독 컴포넌트 자동 리렌더).

### 저장 — `updateUser(patch) => Promise<string | null>`

| patch | 동작 | 반환 |
|-------|------|------|
| `{ introduction: string }` | trim 후 빈 문자열이면 `null`, 아니면 원문을 `profile.introduction`에 update | 성공: `null` / 실패: 사용자용 오류 메시지 문자열 |
| `{ name: string }` | 기존 동작 그대로 (변경 금지) | 기존과 동일 |
| `{ avatar: ... }` 등 기타 키 | 기존 동작 그대로 — localStorage 오버레이. **`introduction`은 절대 오버레이로 가면 안 됨** | `null` |

- 비로그인 상태: `"로그인이 필요합니다."` 반환 (기존 규칙 동일).
- 저장 성공 시 내부 `profile` 상태가 update 반환 행으로 동기화되어 `user.introduction`에 즉시 반영된다.
- 500자 초과 검증은 UI 계층 책임(아래 ③). 스토어는 전달값을 신뢰하되 trim/null 정규화는 스토어 책임.

## ② Supabase 계약 — `public.profile` (PostgREST)

### SELECT (프로필 로드 시)

```js
supabase.from("profile")
  .select("id, name, introduction")   // 기존 "id, name"에 introduction 추가
  .eq("user_id", uid)
  .maybeSingle()
```

- RLS `profile_select_own`에 의해 본인 행만 반환. 행 없음 → `data: null` (기존 처리 유지).

### UPDATE (자기소개 저장 시)

```js
supabase.from("profile")
  .update({ introduction: value })    // value: string | null
  .eq("user_id", uid)
  .select("id, name, introduction")
  .single()
```

- RLS `profile_update_own`에 의해 본인 행만 수정 가능.
- 오류(`error` 존재) 시 스토어는 콘솔 경고 + 사용자용 메시지 반환, 상태 변경 없음.
- **스키마 변경 절대 금지**: DDL, 컬럼 추가/변경, 정책 변경 요청을 보내지 않는다.

## ③ UI 계약 — 마이페이지 자기소개 영역 (`app/profile/page.jsx`)

| 항목 | 계약 |
|------|------|
| 표시 | 별명 f-row 아래 "자기소개" f-row. `<textarea class="input">`, 여러 줄, 세로 리사이즈 |
| 초기값 | `user.introduction` (로드 지연 시 값 도착하면 동기화 — 별명과 동일 useEffect 패턴) |
| placeholder | 자기소개 없음 상태에서 작성 유도 문구 표시 (FR-001) |
| 길이 제한 | `maxLength=500` + 저장 핸들러에서 `length > 500` 재검증(초과 시 저장 차단 + `.f-error`) |
| 저장 버튼 | 클릭 시 `updateUser({ introduction })`. 저장 중 disabled + "저장 중…" 라벨 |
| 성공 피드백 | `.saved-msg` "저장되었습니다 ✓" 2초 표시 (기존 별명과 동일) |
| 실패 피드백 | `.f-error`에 반환 메시지 표시, textarea 값 유지 (FR-008) |
| 회귀 금지 | 별명·프로필 이미지·로그아웃 UI/동작 변경 없음 (FR-010) |
