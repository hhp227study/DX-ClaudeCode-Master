# 실제 구글 로그인 전환 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 미니 노션의 가짜 로그인을 Supabase Auth 구글 OAuth로 교체한다.

**Architecture:** `@supabase/supabase-js` 싱글톤 클라이언트를 추가하고, `lib/store.jsx`의 인증 상태를 Supabase 세션에서 파생시킨다. 노트 CRUD와 라우트 가드는 그대로 두고, 프로필 커스텀(별명/아바타)은 사용자 ID별 localStorage 오버레이로 유지한다.

**Tech Stack:** Next.js 15 (App Router, 올-클라이언트), @supabase/supabase-js v2, Supabase Auth (Google provider 활성화 완료)

## Global Constraints

- 스펙: `docs/superpowers/specs/2026-07-15-google-login-design.md`
- 테스트 러너 없음 — 스펙의 결정대로 각 태스크는 dev 서버 + 브라우저로 검증한다 (unit test 추가 금지, YAGNI)
- Supabase URL: `https://ayjeyrfdyvrwtnshkjrm.supabase.co`
- publishable key: `sb_publishable_7txhjWxRuRhaDNtt41reuw__k4hlaiN`
- `@supabase/ssr`, 미들웨어, 서버 콜백 라우트 도입 금지 (스펙 결정)
- 노트 데이터는 localStorage 키 `mini-notion-v1` 유지, 프로필 오버레이는 `mini-notion-profile-<uid>`
- 브라우저 조작은 wmux browser 명령 사용 (Playwright 금지 — CLAUDE.md)
- 커밋은 리포 루트(`/mnt/c/Users/hong2/IntelliJIDEAProjects/DX-ClaudeCode-Master`)에서 해당 파일만 `git add`

---

### Task 1: 의존성 + 환경변수 + Supabase 클라이언트

**Files:**
- Modify: `package.json` (npm install로 자동 변경)
- Create: `.env.local`
- Create: `lib/supabaseClient.js`

**Interfaces:**
- Produces: `import { supabase } from "@/lib/supabaseClient"` — supabase-js v2 클라이언트 싱글톤

- [ ] **Step 1: 패키지 설치**

Run: `npm install @supabase/supabase-js`
Expected: package.json dependencies에 `@supabase/supabase-js` 추가됨

- [ ] **Step 2: `.env.local` 생성**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ayjeyrfdyvrwtnshkjrm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_7txhjWxRuRhaDNtt41reuw__k4hlaiN
```

`.env.local`이 gitignore에 걸리는지 확인: `git check-ignore -v 03-notion/15-notion-social-login/.env.local` (리포 루트에서). 무시되지 않으면 리포 루트 `.gitignore`에 `.env.local` 추가.

- [ ] **Step 3: `lib/supabaseClient.js` 생성**

```js
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
```

- [ ] **Step 4: 컴파일 검증**

Run: `npm run dev` (백그라운드, 포트 충돌 시 `-p 3001`)
Expected: `/login` 접속 시 컴파일 에러 없이 기존 로그인 페이지 렌더

- [ ] **Step 5: Commit**

```bash
git add 03-notion/15-notion-social-login/package.json 03-notion/15-notion-social-login/package-lock.json 03-notion/15-notion-social-login/lib/supabaseClient.js
git commit -m "feat: supabase-js 클라이언트 추가"
```

---

### Task 2: store.jsx 인증을 Supabase 세션 기반으로 교체

**Files:**
- Modify: `lib/store.jsx`

**Interfaces:**
- Consumes: Task 1의 `supabase`
- Produces: `useStore()`가 반환하는 `{ ready, user, notes, login, logout, updateUser, createNote, updateNote, deleteNote }` — 시그니처 유지. 단 `login()`은 이제 `Promise<string|null>` (에러 메시지 또는 null)을 반환하고 리다이렉트를 일으킴. `user`는 `{ name: string, avatar: string|null }` 유지.

- [ ] **Step 1: `lib/store.jsx` 교체**

전체 파일을 다음으로 교체 (seedNotes/makeId/daysAgo/formatDate/noteTitle은 기존 그대로 유지):

```jsx
"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const KEY = "mini-notion-v1";

const profileKey = (uid) => `mini-notion-profile-${uid}`;

// ... daysAgo, makeId, seedNotes 기존 그대로 ...

export function StoreProvider({ children }) {
  const [notes, setNotes] = useState([]);
  const [notesReady, setNotesReady] = useState(false);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [overlay, setOverlay] = useState(null);

  const uid = session?.user?.id ?? null;

  useEffect(() => {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(KEY));
    } catch {
      saved = null;
    }
    setNotes(saved && Array.isArray(saved.notes) ? saved.notes : seedNotes);
    setNotesReady(true);
  }, []);

  useEffect(() => {
    if (notesReady) localStorage.setItem(KEY, JSON.stringify({ notes }));
  }, [notes, notesReady]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) {
      setOverlay(null);
      return;
    }
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(profileKey(uid)));
    } catch {
      saved = null;
    }
    setOverlay(saved ?? {});
  }, [uid]);

  const value = useMemo(() => {
    const meta = session?.user?.user_metadata ?? {};
    const user = session?.user
      ? {
          name: meta.full_name || meta.name || session.user.email || "사용자",
          avatar: meta.avatar_url || null,
          ...(overlay ?? {}),
        }
      : null;

    const login = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return error?.message ?? null;
    };

    const logout = () => supabase.auth.signOut();

    const updateUser = (patch) => {
      if (!uid) return;
      const next = { ...(overlay ?? {}), ...patch };
      setOverlay(next);
      localStorage.setItem(profileKey(uid), JSON.stringify(next));
    };

    // createNote / updateNote / deleteNote는 기존 로직 그대로, setState 대신 setNotes 사용

    const createNote = (partial = {}) => {
      const now = new Date().toISOString();
      const note = {
        id: makeId(),
        emoji: "🗒️",
        title: "",
        content: "",
        createdAt: now,
        updatedAt: now,
        ...partial,
      };
      setNotes((ns) => [note, ...ns]);
      return note.id;
    };

    const updateNote = (id, patch) =>
      setNotes((ns) =>
        ns.map((n) =>
          n.id === id
            ? { ...n, ...patch, updatedAt: new Date().toISOString() }
            : n
        )
      );

    const deleteNote = (id) => setNotes((ns) => ns.filter((n) => n.id !== id));

    return {
      ready: authReady && notesReady,
      user,
      notes,
      login,
      logout,
      updateUser,
      createNote,
      updateNote,
      deleteNote,
    };
  }, [session, overlay, uid, notes, authReady, notesReady]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
```

주의: supabase-js v2의 `onAuthStateChange`는 구독 직후 `INITIAL_SESSION` 이벤트를 반드시 발생시키므로 별도 `getSession()` 호출이 필요 없다.

- [ ] **Step 2: 브라우저 검증 (비로그인 가드)**

Run: `wmux browser open http://localhost:3000` → snapshot
Expected: 세션이 없으므로 `/login`으로 리다이렉트, 로그인 페이지 렌더. 콘솔 에러 없음.

- [ ] **Step 3: Commit**

```bash
git add 03-notion/15-notion-social-login/lib/store.jsx
git commit -m "feat: 인증 상태를 Supabase 세션 기반으로 교체"
```

---

### Task 3: 로그인 페이지 — 실제 OAuth 호출 + 에러 표시

**Files:**
- Modify: `app/login/page.jsx:17-20` (onGoogleLogin), 버튼 아래 에러 표시 추가

**Interfaces:**
- Consumes: Task 2의 `login(): Promise<string|null>`

- [ ] **Step 1: 핸들러 교체**

```jsx
const [error, setError] = useState("");
const [pending, setPending] = useState(false);

const onGoogleLogin = async () => {
  setPending(true);
  setError("");
  const msg = await login();
  if (msg) {
    setError(msg);
    setPending(false);
  }
};
```

`router.replace("/")` 호출 제거 (OAuth 리다이렉트가 대체). `import { useState } from "react"` 추가.

- [ ] **Step 2: 버튼/에러 마크업**

```jsx
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
```

- [ ] **Step 3: 브라우저 검증 (동의 화면 도달)**

Run: `wmux browser open http://localhost:3000/login` → snapshot → 로그인 버튼 클릭 → snapshot
Expected: `accounts.google.com` 동의/계정 선택 화면으로 이동

- [ ] **Step 4: Commit**

```bash
git add 03-notion/15-notion-social-login/app/login/page.jsx
git commit -m "feat: 구글 OAuth 로그인 버튼 연결"
```

---

### Task 4: E2E 검증 (사용자 참여)

**Files:** 없음 (검증만)

- [ ] **Step 1: 사용자 로그인 요청**

wmux 브라우저 패널에서 사용자가 직접 구글 계정으로 로그인하도록 안내.

- [ ] **Step 2: 복귀 후 상태 확인**

Expected: `/`로 복귀, 사이드바 하단에 구글 이름/아바타 표시, 노트 목록 정상

- [ ] **Step 3: 세션 유지 확인**

Run: `wmux browser reload` → snapshot
Expected: 로그인 상태 유지

- [ ] **Step 4: 마이페이지 + 로그아웃 확인**

`/profile`에서 별명 변경 → 사이드바 반영 확인 → 로그아웃 → `/login` 복귀 확인

- [ ] **Step 5: 실패 시 대응**

복귀 리다이렉트가 실패하면 Supabase 대시보드 Authentication → URL Configuration의 Redirect URLs에 dev origin(`http://localhost:3000/**`) 추가를 사용자에게 요청 (MCP로 불가).
