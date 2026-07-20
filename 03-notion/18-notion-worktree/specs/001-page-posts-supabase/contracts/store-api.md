# Contract: `useStore()` 노트 인터페이스

화면 컴포넌트(AppShell, HomePage, NoteDetail, NoteEditor, SearchModal)가 의존하는 스토어 계약.
**목표: 시그니처를 유지해 화면 변경을 최소화하되, 비동기 저장에 필요한 상태를 추가한다.**

## 유지되는 계약 (기존과 동일)

| 멤버 | 타입 | 의미 |
|---|---|---|
| `ready` | boolean | 인증 상태 + 노트 첫 조회가 끝났는가. `true` 전에는 부팅 화면 표시 (R9: 상세 페이지 리다이렉트 게이트로도 사용) |
| `user` | object \| null | 로그인 사용자 표시 정보. null이면 AppShell이 `/login?next=<현재경로>`로 이동 |
| `notes` | Note[] | **현재 로그인 사용자의** 글 목록, `createdAt` 내림차순. 비로그인·로딩 전엔 `[]` |
| `createNote(partial?)` | `(obj?) => string` | 새 글을 낙관적으로 목록 맨 앞에 추가하고 **id를 동기 반환** (기존 화면 흐름 유지, R5). DB insert는 백그라운드 수행 |
| `updateNote(id, patch)` | `(string, {title?, content?}) => void` | 로컬 상태 즉시 반영 + 노트별 디바운스(600ms) 후 DB update (R4) |
| `deleteNote(id)` | `(string) => void` | 로컬에서 즉시 제거 + DB delete. 실패 시 오류 상태 설정 및 목록 복원 |
| `login()` / `logout()` / `updateUser()` | 기존 그대로 | 범위 외 (변경 없음) |

Note 객체 형태는 [data-model.md](../data-model.md)의 UI 매핑을 따른다 (`id, emoji, title, content, createdAt, updatedAt`— 화면 코드 수정 없이 렌더 가능해야 함).

## 추가되는 계약

| 멤버 | 타입 | 의미 |
|---|---|---|
| `noteError` | string \| null | 마지막 저장·삭제·조회 실패의 사용자용 메시지 (FR-008). 성공 시 자동 해제 |
| `clearNoteError()` | `() => void` | 오류 배너 닫기 |

## 동작 규칙

1. **인증 결합**: `uid` 변경 시(로그인/로그아웃/계정 전환) 노트 목록을 다시 조회하고, 로그아웃 시 `notes = []`로 초기화한다. localStorage에는 노트를 읽지도 쓰지도 않는다 (FR-009).
2. **조회**: `from("page").select().order("created_at", desc)` — RLS가 본인 글만 반환하지만, 방어적으로 결과를 그대로 신뢰한다(클라이언트 필터 불필요).
3. **등록**: 미로그인 상태에서 `createNote`가 호출되면 아무것도 삽입하지 않는다(화면 가드가 선차단, RLS가 최종 차단).
4. **자동 저장**: 같은 id에 연속 입력 시 마지막 patch만 저장되면 된다(디바운스 병합). 페이지 이탈(unmount) 시 보류 중인 저장은 즉시 flush한다.
5. **실패 처리**: insert/update/delete 실패 시 `noteError` 설정. update 실패 시 입력 내용은 화면에 유지(재시도 가능), delete 실패 시 목록 복원, insert 실패 시 낙관적으로 추가한 글 제거.

## 소비자 영향 점검

- `AppShell`: 리다이렉트에 `next` 쿼리 추가 외 변경 없음. `notes.length`, 사이드바 목록 그대로 동작
- `HomePage`(3뷰): `formatDate(n.updatedAt)` 표기가 작성일 기준으로 바뀌는 것 외 코드 변경 없음 (라벨 "편집"→"작성" 수정)
- `NoteDetail`: `ready` 게이트 반영 (로딩 전 홈 리다이렉트 금지, R9)
- `NoteEditor`, `SearchModal`: 변경 없음
- `LoginPage`: 로그인 후 `next` 파라미터 경로로 복귀 (R7)
