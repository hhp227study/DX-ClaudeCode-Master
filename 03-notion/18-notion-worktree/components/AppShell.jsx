"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useStore, noteTitle } from "@/lib/store";
import SearchModal from "@/components/SearchModal";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppShell({ children }) {
  const {
    ready,
    user,
    notes,
    createNote,
    noteError,
    clearNoteError,
    consumeNextPath,
    sidebarCollapsed,
    toggleSidebar,
  } = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      const next =
        pathname && pathname !== "/" ? `?next=${encodeURIComponent(pathname)}` : "";
      router.replace(`/login${next}`);
      return;
    }
    // OAuth 왕복 후 홈으로 돌아온 경우, 로그인 전에 가려던 화면으로 복귀
    const next = consumeNextPath();
    if (next && next !== pathname) router.replace(next);
  }, [ready, user, router, pathname, consumeNextPath]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready || !user) return <div className="boot" />;

  const newNote = () => {
    const id = createNote();
    router.push(`/notes/${id}`);
  };

  return (
    <div className="shell">
      <aside className={`sidebar${sidebarCollapsed ? " collapsed" : ""}`}>
        <div className="side-top">
          <Link href="/" className="brand">
            <span
              className="brand-tile"
              style={{ width: 22, height: 22, borderRadius: 6, fontSize: 11 }}
            >
              미
            </span>
            <span className="brand-name">미니 노션</span>
          </Link>
          <button
            className="side-toggle"
            onClick={toggleSidebar}
            aria-label={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {sidebarCollapsed ? "»" : "«"}
          </button>
        </div>

        <button className="nav" title="검색" onClick={() => setSearchOpen(true)}>
          <span className="ic">🔍</span>
          <span className="label">검색</span>
        </button>
        <button className="nav blue" title="새 글" onClick={newNote}>
          <span className="ic">＋</span>
          <span className="label">새 글</span>
        </button>

        {!sidebarCollapsed && (
          <>
            <div className="seclab">
              <span>글 목록</span>
              <span className="count">{notes.length}</span>
            </div>
            {notes.map((n) => (
              <Link
                key={n.id}
                href={`/notes/${n.id}`}
                className={`nav${pathname === `/notes/${n.id}` ? " on" : ""}`}
              >
                <span className="ic">{n.emoji}</span>
                <span className="label">{noteTitle(n)}</span>
              </Link>
            ))}
          </>
        )}

        <div className="side-foot">
          <ThemeToggle />
          <Link
            href="/profile"
            title="프로필"
            className={`nav${pathname === "/profile" ? " on" : ""}`}
          >
            <span className="ava">
              {user.avatar ? (
                <img src={user.avatar} alt="" />
              ) : (
                user.name.slice(0, 1)
              )}
            </span>
            <span className="label" style={{ fontWeight: 600 }}>
              {user.name}님
            </span>
          </Link>
        </div>
      </aside>

      <main className="main">{children}</main>

      {noteError && (
        <div className="save-toast" role="alert">
          <span>{noteError}</span>
          <button className="save-toast-close" aria-label="닫기" onClick={clearNoteError}>
            ✕
          </button>
        </div>
      )}

      {searchOpen && <SearchModal onClose={() => setSearchOpen(false)} />}
    </div>
  );
}
