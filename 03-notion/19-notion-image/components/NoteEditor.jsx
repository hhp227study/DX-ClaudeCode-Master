"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";

const BLOCKS = [
  {
    id: "page",
    icon: "📄",
    name: "페이지",
    desc: "새 글(페이지)을 만듭니다",
    keywords: ["page", "페이지", "p"],
  },
  {
    id: "text",
    icon: "📝",
    name: "텍스트",
    desc: "일반 텍스트 블록",
    keywords: ["text", "텍스트", "t"],
  },
];

const LINE_HEIGHT = 25.5; /* 15px * 1.7 — .ed-body와 일치해야 슬래시 메뉴가 캐럿 아래에 붙는다 */

export default function NoteEditor({ note, compact = false, titleInputRef }) {
  const { updateNote, createNote } = useStore();
  const router = useRouter();
  const bodyRef = useRef(null);
  const [menu, setMenu] = useState(null); // { lineStart, caret, query, top, index }

  const items = menu
    ? BLOCKS.filter((b) => {
        const q = menu.query.toLowerCase();
        if (!q) return true;
        return (
          b.keywords.some((k) => k.startsWith(q)) || b.name.includes(menu.query)
        );
      })
    : [];

  const autoGrow = () => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  useEffect(() => {
    autoGrow();
    setMenu(null);
  }, [note.id]);

  const detectSlash = (value, caret) => {
    const lineStart = value.lastIndexOf("\n", caret - 1) + 1;
    const lineText = value.slice(lineStart, caret);
    const match = /^\/(\S*)$/.exec(lineText);
    if (!match) {
      setMenu(null);
      return;
    }
    const lineNo = value.slice(0, lineStart).split("\n").length - 1;
    setMenu({
      lineStart,
      caret,
      query: match[1],
      top: (lineNo + 1) * LINE_HEIGHT + 6,
      index: 0,
    });
  };

  const onBodyChange = (e) => {
    updateNote(note.id, { content: e.target.value });
    autoGrow();
    detectSlash(e.target.value, e.target.selectionStart);
  };

  const applyBlock = (block) => {
    const value = bodyRef.current.value;
    const cleaned = value.slice(0, menu.lineStart) + value.slice(menu.caret);
    updateNote(note.id, { content: cleaned });
    setMenu(null);
    if (block.id === "page") {
      const id = createNote();
      router.push(`/notes/${id}`);
    } else {
      requestAnimationFrame(() => {
        const el = bodyRef.current;
        if (el) {
          el.focus();
          el.setSelectionRange(menu.lineStart, menu.lineStart);
        }
      });
    }
  };

  const onBodyKeyDown = (e) => {
    if (!menu || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMenu((m) => ({ ...m, index: (m.index + 1) % items.length }));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setMenu((m) => ({ ...m, index: (m.index - 1 + items.length) % items.length }));
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      applyBlock(items[Math.min(menu.index, items.length - 1)]);
    } else if (e.key === "Escape") {
      setMenu(null);
    }
  };

  return (
    <div className={`editor${compact ? " compact" : ""}`}>
      <input
        ref={titleInputRef}
        className="ed-title"
        placeholder="제목 없음"
        value={note.title}
        onChange={(e) => updateNote(note.id, { title: e.target.value })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            bodyRef.current?.focus();
          }
        }}
      />
      <div className="ed-wrap">
        <textarea
          ref={bodyRef}
          className="ed-body"
          placeholder={'내용을 입력하세요. "/" 를 입력하면 블록 메뉴가 열립니다.'}
          value={note.content}
          onChange={onBodyChange}
          onKeyDown={onBodyKeyDown}
          onClick={() => setMenu(null)}
          onBlur={() => setTimeout(() => setMenu(null), 150)}
        />
        {menu && items.length > 0 && (
          <div className="slash-menu" style={{ top: menu.top, left: 0 }}>
            <div className="slash-sec">기본 블록</div>
            {items.map((b, i) => (
              <div
                key={b.id}
                className={`slash-item${i === Math.min(menu.index, items.length - 1) ? " on" : ""}`}
                onMouseEnter={() => setMenu((m) => ({ ...m, index: i }))}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyBlock(b);
                }}
              >
                <span className="slash-ic">{b.icon}</span>
                <span>
                  <span className="slash-name">{b.name}</span>
                  <span className="slash-desc">{b.desc}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
