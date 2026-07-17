"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const profileKey = (uid) => `mini-notion-profile-${uid}`;

const NEXT_KEY = "mini-notion-next";
const SIDEBAR_KEY = "mini-notion-sidebar";
const NOTE_EMOJI = "🗒️";
const SAVE_DEBOUNCE_MS = 600;

const StoreContext = createContext(null);

function makeId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// page 테이블 행 → 화면 note 객체 (updated_at 컬럼이 없어 createdAt을 재사용)
const rowToNote = (row) => ({
  id: row.id,
  emoji: NOTE_EMOJI,
  title: row.title ?? "",
  content: row.content ?? "",
  createdAt: row.created_at,
  updatedAt: row.created_at,
});

async function fetchNotes() {
  const { data, error } = await supabase
    .from("page")
    .select("id, title, content, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(rowToNote);
}

export function StoreProvider({ children }) {
  const [notes, setNotes] = useState([]);
  const [notesReady, setNotesReady] = useState(false);
  const [noteError, setNoteError] = useState(null);
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [overlay, setOverlay] = useState(null);
  const [profile, setProfile] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarReady, setSidebarReady] = useState(false);

  const uid = session?.user?.id ?? null;

  const saveTimers = useRef(new Map()); // note id → debounce timer
  const pendingPatches = useRef(new Map()); // note id → 저장 대기 중인 {title?, content?}

  useEffect(() => {
    let saved = null;
    try {
      saved = localStorage.getItem(SIDEBAR_KEY);
    } catch {
      saved = null;
    }
    setSidebarCollapsed(saved === "collapsed");
    setSidebarReady(true);
  }, []);

  useEffect(() => {
    if (!sidebarReady) return;
    try {
      localStorage.setItem(
        SIDEBAR_KEY,
        sidebarCollapsed ? "collapsed" : "expanded"
      );
    } catch {
      // 저장 불가 환경에서도 토글 자체는 동작해야 한다
    }
  }, [sidebarCollapsed, sidebarReady]);

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
    if (!authReady) return;
    if (!uid) {
      setNotes([]);
      setNotesReady(true);
      return;
    }
    let cancelled = false;
    setNotesReady(false);
    fetchNotes()
      .then((ns) => {
        if (!cancelled) setNotes(ns);
      })
      .catch((err) => {
        console.warn("글 목록 조회 실패:", err.message);
        if (!cancelled) {
          setNotes([]);
          setNoteError("글 목록을 불러오지 못했습니다. 네트워크 확인 후 새로고침해 주세요.");
        }
      })
      .finally(() => {
        if (!cancelled) setNotesReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [uid, authReady]);

  const flushNote = (id) => {
    const timer = saveTimers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      saveTimers.current.delete(id);
    }
    const patch = pendingPatches.current.get(id);
    if (!patch) return;
    pendingPatches.current.delete(id);
    supabase
      .from("page")
      .update(patch)
      .eq("id", id)
      .then(({ error }) => {
        if (error) {
          console.warn("저장 실패:", error.message);
          // 입력은 화면에 남아 있으므로 patch를 되돌려 두면 다음 입력·이탈 시 재시도된다
          pendingPatches.current.set(id, {
            ...patch,
            ...(pendingPatches.current.get(id) ?? {}),
          });
          setNoteError("저장에 실패했습니다. 네트워크 확인 후 이어서 입력하면 다시 저장됩니다.");
        } else {
          setNoteError(null);
        }
      });
  };

  // 새로고침·창 닫기 시 보류 중인 자동 저장을 즉시 전송 (best effort)
  const flushAllRef = useRef(() => {});
  flushAllRef.current = () => {
    for (const id of Array.from(pendingPatches.current.keys())) flushNote(id);
  };
  useEffect(() => {
    const handler = () => flushAllRef.current();
    window.addEventListener("pagehide", handler);
    return () => window.removeEventListener("pagehide", handler);
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
      .select("id, name, introduction")
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
          introduction: profile?.introduction ?? "",
          ...avatarOverlay,
        }
      : null;

    const login = async (next) => {
      try {
        if (next && next.startsWith("/")) localStorage.setItem(NEXT_KEY, next);
        else localStorage.removeItem(NEXT_KEY);
      } catch {}
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      return error?.message ?? null;
    };

    const logout = () => supabase.auth.signOut();

    // OAuth 왕복 후 복귀할 경로를 1회성으로 꺼낸다 (AppShell에서 소비)
    const consumeNextPath = () => {
      try {
        const next = localStorage.getItem(NEXT_KEY);
        if (next) localStorage.removeItem(NEXT_KEY);
        return next && next.startsWith("/") ? next : null;
      } catch {
        return null;
      }
    };

    const updateUser = async (patch) => {
      if (!uid) return "로그인이 필요합니다.";
      // introduction은 DB 저장 대상 — rest(localStorage 오버레이)로 새면 안 됨
      const { name, introduction, ...rest } = patch;
      if (name !== undefined) {
        const { data, error } = await supabase
          .from("profile")
          .update({ name })
          .eq("user_id", uid)
          .select("id, name, introduction")
          .single();
        if (error) {
          console.warn("이름 저장 실패:", error.message);
          return "이름 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
        }
        setProfile(data);
      }
      if (introduction !== undefined) {
        // 앞뒤 공백만 제거해 줄바꿈은 보존, 빈 값은 null(자기소개 없음)로 정규화
        const value = introduction.trim() || null;
        const { data, error } = await supabase
          .from("profile")
          .update({ introduction: value })
          .eq("user_id", uid)
          .select("id, name, introduction")
          .single();
        if (error) {
          console.warn("자기소개 저장 실패:", error.message);
          return "자기소개 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.";
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
      if (!uid) return null;
      const now = new Date().toISOString();
      const note = {
        id: makeId(),
        emoji: NOTE_EMOJI,
        title: "",
        content: "",
        createdAt: now,
        updatedAt: now,
        ...partial,
      };
      setNotes((ns) => [note, ...ns]);
      supabase
        .from("page")
        .insert({ id: note.id, user_id: uid, title: note.title, content: note.content })
        .then(({ error }) => {
          if (error) {
            console.warn("글 생성 실패:", error.message);
            setNotes((ns) => ns.filter((n) => n.id !== note.id));
            setNoteError("글을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
          }
        });
      return note.id;
    };

    const updateNote = (id, patch) => {
      setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, ...patch } : n)));
      const dbPatch = {};
      if (patch.title !== undefined) dbPatch.title = patch.title;
      if (patch.content !== undefined) dbPatch.content = patch.content;
      if (Object.keys(dbPatch).length === 0) return;
      pendingPatches.current.set(id, {
        ...(pendingPatches.current.get(id) ?? {}),
        ...dbPatch,
      });
      const timer = saveTimers.current.get(id);
      if (timer) clearTimeout(timer);
      saveTimers.current.set(
        id,
        setTimeout(() => flushNote(id), SAVE_DEBOUNCE_MS)
      );
    };

    const deleteNote = (id) => {
      const timer = saveTimers.current.get(id);
      if (timer) clearTimeout(timer);
      saveTimers.current.delete(id);
      pendingPatches.current.delete(id);
      setNotes((ns) => ns.filter((n) => n.id !== id));
      supabase
        .from("page")
        .delete()
        .eq("id", id)
        .then(({ error }) => {
          if (error) {
            console.warn("삭제 실패:", error.message);
            setNoteError("삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.");
            // 실제 저장 상태와 어긋나지 않도록 목록을 서버 기준으로 복원
            fetchNotes()
              .then(setNotes)
              .catch(() => {});
          }
        });
    };

    const clearNoteError = () => setNoteError(null);

    const toggleSidebar = () => setSidebarCollapsed((v) => !v);

    return {
      ready: authReady && notesReady,
      user,
      notes,
      noteError,
      sidebarCollapsed,
      toggleSidebar,
      login,
      logout,
      updateUser,
      createNote,
      updateNote,
      deleteNote,
      clearNoteError,
      consumeNextPath,
    };
  }, [session, overlay, profile, uid, notes, authReady, notesReady, noteError, sidebarCollapsed]);

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
