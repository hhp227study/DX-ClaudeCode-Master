"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import NoteEditor from "@/components/NoteEditor";
import { useStore, formatDate, noteTitle } from "@/lib/store";

const VIEW_KEY = "mini-notion-view";

function NotesHome() {
  const { notes, createNote } = useStore();
  const router = useRouter();
  const [view, setView] = useState("list"); // list | card | pane
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem(VIEW_KEY);
    if (saved === "list" || saved === "card" || saved === "pane") setView(saved);
  }, []);

  const changeView = (v) => {
    setView(v);
    localStorage.setItem(VIEW_KEY, v);
  };

  const newNote = () => {
    const id = createNote();
    router.push(`/notes/${id}`);
  };

  const selected =
    notes.find((n) => n.id === selectedId) ?? notes[0] ?? null;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="h1">내 글</h1>
        <div className="head-actions">
          <div className="seg" role="tablist" aria-label="보기 방식">
            <button className={view === "list" ? "on" : ""} onClick={() => changeView("list")}>
              ☰ 리스트
            </button>
            <button className={view === "card" ? "on" : ""} onClick={() => changeView("card")}>
              ▦ 카드
            </button>
            <button className={view === "pane" ? "on" : ""} onClick={() => changeView("pane")}>
              ◫ 3단
            </button>
          </div>
          <button className="btn pri" onClick={newNote}>
            ＋ 새 글
          </button>
        </div>
      </div>

      {notes.length === 0 ? (
        <div className="empty">
          <div className="big">🗒️</div>
          <div className="t">아직 글이 없어요</div>
          <div className="p">
            새 글을 만들고 에디터에서 <code>/page</code> 를 입력해 보세요.
          </div>
          <button className="btn pri" onClick={newNote}>
            ＋ 첫 글 만들기
          </button>
        </div>
      ) : view === "list" ? (
        <div className="note-rows">
          {notes.map((n) => (
            <Link key={n.id} href={`/notes/${n.id}`} className="note-row">
              <div className="t">
                <span>{n.emoji}</span>
                {noteTitle(n)}
              </div>
              {n.content && <div className="p">{n.content}</div>}
              <div className="m">{formatDate(n.createdAt)} 작성</div>
            </Link>
          ))}
        </div>
      ) : view === "card" ? (
        <div className="card-area">
          <div className="note-grid">
            {notes.map((n) => (
              <Link key={n.id} href={`/notes/${n.id}`} className="note-card">
                <div className="e">{n.emoji}</div>
                <div className="t">{noteTitle(n)}</div>
                <div className="p">{n.content}</div>
                <div className="m">{formatDate(n.createdAt)} 작성</div>
              </Link>
            ))}
            <button className="note-card new" onClick={newNote}>
              <div className="plus">＋</div>
              <div className="lbl">새 글 만들기</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="threepane">
          <div className="pane-list">
            {notes.map((n) => (
              <div
                key={n.id}
                className={`pane-item${selected?.id === n.id ? " on" : ""}`}
                onClick={() => setSelectedId(n.id)}
              >
                <div className="t">
                  {n.emoji} {noteTitle(n)}
                </div>
                <div className="p">{n.content || "내용 없음"}</div>
              </div>
            ))}
          </div>
          <div className="pane-detail">
            {selected ? (
              <>
                <div className="pane-toolbar">
                  <button
                    className="pane-open"
                    onClick={() => router.push(`/notes/${selected.id}`)}
                  >
                    전체 화면으로 열기 ↗
                  </button>
                </div>
                <div className="pane-editor">
                  <NoteEditor note={selected} compact />
                </div>
              </>
            ) : (
              <div className="pane-empty">왼쪽에서 글을 선택하세요.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HomePage() {
  return (
    <AppShell>
      <NotesHome />
    </AppShell>
  );
}
