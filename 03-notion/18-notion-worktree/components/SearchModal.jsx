"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStore, noteTitle } from "@/lib/store";

export default function SearchModal({ onClose }) {
  const { notes } = useStore();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter(
      (n) =>
        noteTitle(n).toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q)
    );
  }, [notes, query]);

  useEffect(() => {
    setIndex(0);
  }, [query]);

  const open = (note) => {
    onClose();
    router.push(`/notes/${note.id}`);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, results.length - 1));
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    }
    if (e.key === "Enter" && results[index]) open(results[index]);
  };

  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="search-box" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="search-input"
          placeholder="글 제목이나 내용으로 검색…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <div className="search-res">
          {results.length === 0 ? (
            <div className="search-empty">검색 결과가 없습니다.</div>
          ) : (
            results.map((n, i) => (
              <button
                key={n.id}
                className={`search-item${i === index ? " on" : ""}`}
                onMouseEnter={() => setIndex(i)}
                onClick={() => open(n)}
              >
                <div className="t">
                  {n.emoji} {noteTitle(n)}
                </div>
                <div className="p">{n.content || "내용 없음"}</div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
