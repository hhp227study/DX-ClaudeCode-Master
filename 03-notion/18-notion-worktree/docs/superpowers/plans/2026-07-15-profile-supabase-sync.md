# 프로필 Supabase 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 구글 최초 로그인 시 `profile` 행을 자동 생성(1:1 FK, name=DisplayName)하고, 마이페이지 이름 변경을 `profile` 테이블과 연동한다.

**Architecture:** DB 트리거(`auth.users` insert → `public.profile` insert)가 프로필 생성을 전담하고, RLS는 본인 행 select/update만 허용한다. 앱(`lib/store.jsx`)은 로그인 후 profile을 조회해 `user.name`으로 노출하고, 이름 저장을 DB update로 수행한다. 아바타는 기존 localStorage 오버레이를 유지한다.

**Tech Stack:** Next.js 15 (App Router, JSX), @supabase/supabase-js v2, Supabase Postgres (MCP 도구 `mcp__supabase__apply_migration` / `mcp__supabase__execute_sql`로 DB 작업).

**Spec:** `docs/superpowers/specs/2026-07-15-profile-supabase-sync-design.md`

## Global Constraints

- 이 프로젝트에는 테스트 프레임워크가 없다 (package.json에 test 스크립트 없음). 검증은 ① DB는 SQL 조회, ② 앱 코드는 `npm run build` 성공, ③ 수동 브라우저 시나리오로 수행한다. 테스트 프레임워크를 새로 추가하지 않는다 (YAGNI).
- 아바타(프로필 이미지)는 localStorage 저장을 유지한다. profile 테이블에 avatar 컬럼을 추가하지 않는다.
- name 초기값 규칙(트리거·backfill 공통): `raw_user_meta_data->>'full_name'` → `raw_user_meta_data->>'name'` → `email` 순 coalesce.
- 모든 셸 명령의 작업 디렉터리: `03-notion/16-notion-profile` (git 저장소 루트는 상위 `DX-ClaudeCode-Master`).
- 커밋 메시지는 기존 관례(한국어, `feat:`/`docs:` prefix)를 따르고 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`로 끝낸다.

---

### Task 1: DB 마이그레이션 — 스키마 정리 + 자동 생성 트리거 + backfill + RLS

**Files:**
- Create: `supabase/profile_sync.sql` (적용한 마이그레이션 SQL의 저장소 사본)

**Interfaces:**
- Consumes: 기존 `public.profile` 테이블 (id uuid PK, created_at, name text, user_id uuid FK→auth.users.id, 현재 0행·정책 0개)
- Produces: `profile.user_id`가 not null + unique(1:1), 신규 가입 시 profile 자동 생성, authenticated 사용자가 본인 행을 select/update 가능. Task 2는 `from("profile").select("id, name").eq("user_id", uid)` 및 `.update({ name })`이 동작한다고 가정한다.

- [ ] **Step 1: 마이그레이션 적용**

`mcp__supabase__apply_migration` 도구로 name=`profile_auto_create_and_rls`, query는 아래 전문:

```sql
-- 1:1 관계 강제를 위한 스키마 정리 (현재 0행이라 안전)
alter table public.profile alter column user_id drop default;
alter table public.profile alter column user_id set not null;
alter table public.profile add constraint profile_user_id_key unique (user_id);

-- 최초 로그인(가입) 시 profile 자동 생성 트리거
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profile (user_id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      new.email
    )
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 기존 가입자 backfill (profile 없는 유저만)
insert into public.profile (user_id, name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  )
from auth.users u
where not exists (
  select 1 from public.profile p where p.user_id = u.id
);

-- RLS: 본인 행만 조회/수정 (insert/delete 정책은 의도적으로 없음 —
-- 생성은 security definer 트리거, 삭제는 FK cascade가 전담)
create policy "profile_select_own"
  on public.profile for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "profile_update_own"
  on public.profile for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
```

- [ ] **Step 2: 트리거·제약·정책 존재 검증**

`mcp__supabase__execute_sql`로 실행:

```sql
select
  (select count(*) from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'on_auth_user_created') as trigger_count,
  (select count(*) from pg_constraint
    where conrelid = 'public.profile'::regclass
      and contype = 'u') as unique_count,
  (select count(*) from pg_policies
    where tablename = 'profile') as policy_count;
```

Expected: `trigger_count = 1`, `unique_count = 1`, `policy_count = 2`

- [ ] **Step 3: backfill 결과 검증**

```sql
select p.name, u.email,
       u.raw_user_meta_data->>'full_name' as display_name
from public.profile p
join auth.users u on u.id = p.user_id;
```

Expected: 1행. `name`이 `display_name`과 동일 (기존 가입자의 구글 DisplayName).

- [ ] **Step 4: SQL 사본을 저장소에 기록**

`supabase/profile_sync.sql` 파일을 생성하고 Step 1의 SQL 전문을 그대로 저장.

- [ ] **Step 5: Commit**

```bash
git add supabase/profile_sync.sql
git commit -m "feat: profile 자동 생성 트리거·RLS 마이그레이션

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: store.jsx — profile 조회 및 이름 저장 연동

**Files:**
- Modify: `lib/store.jsx`

**Interfaces:**
- Consumes: Task 1의 profile 테이블 (본인 행 select/update 가능, 로그인 유저는 행이 반드시 존재)
- Produces: `useStore()`가 반환하는 `user.name`(profile.name 우선), `updateUser(patch)` — **async 함수**로 변경됨. `{ name }` 포함 시 DB 저장, 성공 시 `null`·실패 시 에러 메시지 문자열 반환. `{ avatar }`는 기존대로 localStorage 오버레이에 저장. Task 3은 `await updateUser({ name })`의 반환값으로 성공/실패를 판단한다.

- [ ] **Step 1: profile 상태와 조회 effect 추가**

`lib/store.jsx`의 상태 선언부(75행 근처 `const [overlay, setOverlay] = useState(null);` 다음)에 추가:

```jsx
  const [profile, setProfile] = useState(null);
```

overlay 로딩 effect(105–117행) 바로 다음에 profile 조회 effect 추가:

```jsx
  useEffect(() => {
    if (!uid) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    supabase
      .from("profile")
      .select("id, name")
      .eq("user_id", uid)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.warn("프로필 조회 실패:", error.message);
        setProfile(data ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [uid]);
```

- [ ] **Step 2: user 구성에서 profile.name 우선 적용**

`useMemo` 안의 기존 코드:

```jsx
    const meta = session?.user?.user_metadata ?? {};
    const user = session?.user
      ? {
          name: meta.full_name || meta.name || session.user.email || "사용자",
          avatar: meta.avatar_url || null,
          ...(overlay ?? {}),
        }
      : null;
```

를 아래로 교체 (오버레이에 남아 있을 수 있는 옛 `name` 값이 profile을 덮지 않도록 name을 분리):

```jsx
    const meta = session?.user?.user_metadata ?? {};
    const { name: _overlayName, ...avatarOverlay } = overlay ?? {};
    const user = session?.user
      ? {
          name:
            profile?.name ||
            meta.full_name ||
            meta.name ||
            session.user.email ||
            "사용자",
          avatar: meta.avatar_url || null,
          ...avatarOverlay,
        }
      : null;
```

- [ ] **Step 3: updateUser를 async DB 저장으로 교체**

기존 코드:

```jsx
    const updateUser = (patch) => {
      if (!uid) return;
      const next = { ...(overlay ?? {}), ...patch };
      setOverlay(next);
      localStorage.setItem(profileKey(uid), JSON.stringify(next));
    };
```

를 아래로 교체:

```jsx
    const updateUser = async (patch) => {
      if (!uid) return "로그인이 필요합니다.";
      const { name, ...rest } = patch;
      if (name !== undefined) {
        const { data, error } = await supabase
          .from("profile")
          .update({ name })
          .eq("user_id", uid)
          .select("id, name")
          .single();
        if (error) {
          console.warn("이름 저장 실패:", error.message);
          return "이름 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        }
        setProfile(data);
      }
      if (Object.keys(rest).length > 0) {
        const next = { ...(overlay ?? {}), ...rest };
        setOverlay(next);
        localStorage.setItem(profileKey(uid), JSON.stringify(next));
      }
      return null;
    };
```

- [ ] **Step 4: useMemo 의존성에 profile 추가**

기존:

```jsx
  }, [session, overlay, uid, notes, authReady, notesReady]);
```

교체:

```jsx
  }, [session, overlay, profile, uid, notes, authReady, notesReady]);
```

- [ ] **Step 5: 빌드로 검증**

Run: `npm run build`
Expected: `✓ Compiled successfully` (에러 0)

- [ ] **Step 6: Commit**

```bash
git add lib/store.jsx
git commit -m "feat: 프로필 이름을 profile 테이블과 연동

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: 마이페이지 — async 저장 UX (저장 중·성공·실패 표시)

**Files:**
- Modify: `app/profile/page.jsx`

**Interfaces:**
- Consumes: Task 2의 `updateUser` — async, 성공 시 `null`·실패 시 에러 메시지 문자열 반환. `user.name`은 profile 로딩 완료 시 비동기로 갱신될 수 있음.
- Produces: 마이페이지 이름 저장이 DB 반영을 기다렸다가 결과를 표시. (다른 컴포넌트가 의존하는 인터페이스 없음)

- [ ] **Step 1: 상태 추가 및 user.name 동기화**

`ProfileForm` 상단 기존:

```jsx
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [imgError, setImgError] = useState("");
```

교체:

```jsx
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nameError, setNameError] = useState("");
  const [imgError, setImgError] = useState("");
```

`saved` 타이머 useEffect 바로 다음에 추가 (profile이 늦게 로드되면 입력값을 DB 값으로 동기화):

```jsx
  useEffect(() => {
    setName(user.name);
  }, [user.name]);
```

- [ ] **Step 2: onSaveName을 async로 교체**

기존:

```jsx
  const onSaveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(user.name);
      return;
    }
    updateUser({ name: trimmed });
    setSaved(true);
  };
```

교체:

```jsx
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
```

- [ ] **Step 3: 저장 버튼·에러 표시 JSX 교체**

기존:

```jsx
          <button className="btn pri" style={{ height: 38, flex: "none" }} onClick={onSaveName}>
            저장
          </button>
        </div>
        {saved && (
          <div className="saved-msg" style={{ marginTop: 8 }}>
            저장되었습니다 ✓
          </div>
        )}
```

교체:

```jsx
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
```

- [ ] **Step 4: 빌드로 검증**

Run: `npm run build`
Expected: `✓ Compiled successfully` (에러 0)

- [ ] **Step 5: Commit**

```bash
git add app/profile/page.jsx
git commit -m "feat: 마이페이지 이름 저장을 DB 반영 결과와 연동

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: 종단 검증 (수동 시나리오)

**Files:** 없음 (검증 전용)

**Interfaces:**
- Consumes: Task 1–3 전체
- Produces: 스펙의 검증 항목 통과 확인

- [ ] **Step 1: 개발 서버 기동**

Run: `npm run dev` (백그라운드)
Expected: `http://localhost:3000` 기동. (포트 3000 충돌 시 기존 프로세스 종료 후 재시도)

- [ ] **Step 2: 로그인 상태에서 이름 로드 확인**

브라우저에서 `http://localhost:3000` 접속 → 구글 로그인 → 사이드바 하단에 profile 테이블의 `name`이 "◯◯님"으로 표시되는지 확인. (localStorage `mini-notion-profile-<uid>`에 옛 name이 남아 있어도 DB 값이 표시되어야 함)

- [ ] **Step 3: 이름 변경 왕복 확인**

마이페이지(`/profile`)에서 별명을 다른 값으로 저장 → "저장되었습니다 ✓" 표시 확인 → SQL로 확인:

```sql
select name from public.profile;
```

Expected: 방금 저장한 값. 이후 브라우저 새로고침 시에도 새 이름 유지.

- [ ] **Step 4: 아바타 회귀 확인**

마이페이지에서 이미지 변경/제거가 기존대로 동작(localStorage)하고, 이름 저장과 서로 간섭하지 않는지 확인.

- [ ] **Step 5: 스펙 검증 항목 대조**

스펙 `## 5. 검증` 절의 각 항목이 모두 통과했는지 확인하고 결과를 사용자에게 보고.
