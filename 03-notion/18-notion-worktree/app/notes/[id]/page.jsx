"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import NoteEditor from "@/components/NoteEditor";
import { useStore, noteTitle } from "@/lib/store";

function NoteDetail() {
  const { id } = useParams();
  const { notes, deleteNote, ready } = useStore();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const titleRef = useRef(null);
  const moreRef = useRef(null);

  const note = notes.find((n) => n.id === id);

  useEffect(() => {
    // 목록 로딩이 끝난 뒤에도 없는 글(삭제됨·타인 글)만 홈으로 복귀
    if (ready && !note) router.replace("/");
  }, [ready, note, router]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e) => {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  if (!note) return null;

  const onRename = () => {
    setMenuOpen(false);
    titleRef.current?.focus();
    titleRef.current?.select();
  };

  const onDelete = () => {
    setMenuOpen(false);
    if (window.confirm(`"${noteTitle(note)}" 글을 삭제할까요?`)) {
      deleteNote(note.id);
      router.replace("/");
    }
  };

  return (
    <>
      <div className="detail-bar">
        <div className="crumb">
          <Link href="/">글 목록</Link>
          <span className="sep">/</span>
          <span className="cur">{noteTitle(note)}</span>
        </div>
        <div className="more-wrap" ref={moreRef}>
          <button
            className="more-btn"
            aria-label="더 보기"
            onClick={() => setMenuOpen((v) => !v)}
          >
            ···
          </button>
          {menuOpen && (
            <div className="menu-pop">
              <button className="menu-item" onClick={onRename}>
                <span>✎</span> 이름 바꾸기
              </button>
              <button className="menu-item danger" onClick={onDelete}>
                <span>🗑</span> 삭제
              </button>
            </div>
          )}
        </div>
      </div>
      <NoteEditor note={note} titleInputRef={titleRef} />
    </>
  );
}

export default function NoteDetailPage() {
  return (
    <AppShell>
      <NoteDetail />
    </AppShell>
  );
}
