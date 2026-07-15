"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const KEY = "mini-notion-v1";

const profileKey = (uid) => `mini-notion-profile-${uid}`;

const StoreContext = createContext(null);

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const seedNotes = [
  {
    id: makeId(),
    emoji: "🗒️",
    title: "이번 주 할 일",
    content:
      "월요일: 디자인 시스템 토큰 정리\n화요일: 와이어프레임 리뷰 반영\n수요일: 로그인 페이지 구현\n목요일: 글 목록 / 상세 페이지 연결\n금요일: 배포 및 회고 작성",
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
  },
  {
    id: makeId(),
    emoji: "🗒️",
    title: "프로젝트 아이디어",
    content:
      "- 미니 노션: 개인 업무 관리 도구 (진행 중)\n- 카메라 리듬게임 MVP\n- 주간 회고 자동화 봇\n- 가계부 대시보드",
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    id: makeId(),
    emoji: "🗒️",
    title: "회의 메모",
    content:
      "스터디 회의\n- PRD 리뷰: /page 명령이 버튼보다 낫다는 가정 검증 필요\n- 무료 티어 인프라: Vercel 배포 조합으로 결정\n- 다음 주까지 V1 핵심 흐름 완성",
    createdAt: daysAgo(6),
    updatedAt: daysAgo(3),
  },
  {
    id: makeId(),
    emoji: "🗒️",
    title: "읽을 거리",
    content:
      "- 클린 아키텍처 12장\n- Next.js App Router 공식 문서\n- 디자인 시스템, 어떻게 시작할까 (블로그)",
    createdAt: daysAgo(8),
    updatedAt: daysAgo(4),
  },
  {
    id: makeId(),
    emoji: "🗒️",
    title: "장보기 목록",
    content: "우유, 달걀, 식빵\n커피 원두\n세제",
    createdAt: daysAgo(9),
    updatedAt: daysAgo(6),
  },
];

export function StoreProvider({ children }) {
  const [notes, setNotes] = useState([]);
  const [notesReady, setNotesReady] = useState(false);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const [profile, setProfile] = useState(null);

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

  const value = useMemo(() => {
    const meta = session?.user?.user_metadata ?? {};
    // 오버레이에 남아 있을 수 있는 옛 name 값이 profile을 덮지 않도록 분리
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

    const login = async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return error?.message ?? null;
    };

    const logout = () => supabase.auth.signOut();

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
  }, [session, overlay, profile, uid, notes, authReady, notesReady]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const now = new Date();
  const base = `${d.getMonth() + 1}월 ${d.getDate()}일`;
  return d.getFullYear() === now.getFullYear()
    ? base
    : `${d.getFullYear()}년 ${base}`;
}

export function noteTitle(note) {
  return note.title.trim() || "제목 없음";
}
