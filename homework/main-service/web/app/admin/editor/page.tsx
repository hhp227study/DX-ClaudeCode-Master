'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { chartUrl as staticChartUrl, getSong, trackOf, type Difficulty } from '@/lib/songs';
import type { MusicTrack } from '@/lib/engine/audio';
import { createTrack } from '@/lib/engine/track';
import { loadChart, type Chart, type ChartNote, type PoseKind } from '@/lib/engine/chart';
import { fetchChartRow, saveChart, type ChartRowInfo } from '@/lib/admin-api';

/**
 * 채보 에디터 (docs/admin-page.md "구현 현황") — /admin/editor?song=&difficulty=
 * 곡을 틀어놓고(SynthTrack) 필드를 클릭하면 그 시점·위치에 노트가 생긴다.
 * t는 비트 그리드 스냅(실시간 클릭 오차 흡수), 좌표는 클로즈업 기준 단일 소스.
 * 저장은 Storage `{song}-{diff}-v{N}.json` 업로드 + charts 행 갱신 — 배포 없이 반영.
 */

const APPROACH_MS = 2000; // 게임과 동일한 노트 접근 시간 — 미리보기 링도 같은 감각
const MIN_GAP_MS = 750; // 판정 노트 물리 하한 (gen-chart.mjs와 동일)
// 밴드 상한 — 구 0.45("얼굴 가림 금지")는 2026-07-22 폐지 (머리 위 안무를 노트로 못 담았다).
// gen-chart.mjs의 Y_LIMIT_TOP과 같은 값이어야 한다
const Y_MIN = 0.08;
const Y_MAX = 0.73;
// 저작 좌표계와 같은 9:16 — 3:4로 그리면 미리보기가 실제 배치와 다르게 보인다
const FIELD_W = 360;
const FIELD_H = 640;
// 저작 좌표계의 몸 기준선 (docs/reference-choreo-analysis.md: 어깨선 0.55, 어깨너비 0.70,
// 세로 1 몸단위 = 0.394). 작성자가 "몸 어디쯤인지" 보면서 찍을 수 있게 가이드로 그린다
const BODY = { crown: 0.2, eye: 0.31, chin: 0.43, shoulder: 0.55, waist: 0.73 };
const TL_W = 880;
const TL_H = 56;
const NOTE_R = 24;

const PINK = '#ff5c9e';
const PURPLE = '#8f6bdf';
const GOLD = '#ffd93d';

type Tool = 'catch' | 'decoy' | 'pose';

const DEFAULT_MISSION = '버블을 잡고, 퍼플은 피하고, 포즈 타임엔 포즈!';

export default function EditorPage() {
  return (
    <Suspense fallback={null}>
      <EditorInner />
    </Suspense>
  );
}

function EditorInner() {
  const sp = useSearchParams();
  const songId = sp.get('song') ?? '';
  const difficulty = (sp.get('difficulty') as Difficulty) ?? 'easy';
  const song = getSong(songId);

  const [chart, setChart] = useState<Chart | null>(null);
  const [row, setRow] = useState<ChartRowInfo | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('catch');
  const [poseKind, setPoseKind] = useState<PoseKind>('hands_up');
  const [snap, setSnap] = useState(0.5); // 비트 단위 스냅 그리드
  const [selected, setSelected] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [cursorMs, setCursorMs] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [issues, setIssues] = useState<string[] | null>(null);

  const fieldRef = useRef<HTMLCanvasElement>(null);
  const tlRef = useRef<HTMLCanvasElement>(null);
  const trackRef = useRef<MusicTrack | null>(null);

  // rAF 루프·키보드 핸들러가 리렌더 없이 최신값을 읽도록 렌더마다 동기화
  const chartRef = useRef(chart);
  const cursorRef = useRef(0);
  const selectedRef = useRef(selected);
  const playingRef = useRef(playing);
  const toolRef = useRef(tool);
  const poseKindRef = useRef(poseKind);
  const snapRef = useRef(snap);
  const rowRef = useRef(row);
  chartRef.current = chart;
  selectedRef.current = selected;
  playingRef.current = playing;
  toolRef.current = tool;
  poseKindRef.current = poseKind;
  snapRef.current = snap;
  rowRef.current = row;

  const beatMs = song ? 60000 / song.bpm : 500;
  const durMs = song ? song.durationSec * 1000 : 0;

  const flash = (m: string) => {
    setMsg(m);
  };

  const fmtTime = (ms: number) =>
    `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${Math.floor((ms % 1000) / 100)}`;

  const fmtBeat = (t: number) => {
    const off = chartRef.current?.offsetMs ?? 0;
    const b = (t - off) / beatMs;
    return `${Math.floor(b / 4) + 1}마디 ${+(((b % 4) + 4) % 4 + 1).toFixed(2)}박`;
  };

  const snapT = (ms: number) => {
    const off = chartRef.current?.offsetMs ?? 0;
    const g = beatMs * snapRef.current;
    return Math.max(0, Math.min(durMs, Math.round(Math.round((ms - off) / g) * g + off)));
  };

  // ─── 채보 로드 ─────────────────────────────────────────────

  useEffect(() => {
    if (!song) return;
    let on = true;
    void (async () => {
      const res = await fetchChartRow(songId, difficulty);
      if (!on) return;
      if (res.error) {
        setLoadErr(res.error);
        return;
      }
      setRow(res.row);
      try {
        const c = await loadChart(res.row?.chartUrl ?? staticChartUrl(songId, difficulty));
        if (on) setChart(c);
      } catch {
        // 파일 없음 — 빈 채보로 시작 (신규 난이도)
        if (on)
          setChart({
            version: 1,
            songId,
            difficulty,
            bpm: song.bpm,
            offsetMs: 0,
            targetWord: 'Rhy',
            mission: DEFAULT_MISSION,
            notes: [],
          });
      }
    })();
    return () => {
      on = false;
      void trackRef.current?.stop();
      trackRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, difficulty]);

  // ─── 트랜스포트 ────────────────────────────────────────────

  const togglePlay = async () => {
    if (playingRef.current) {
      await trackRef.current?.suspend();
      if (trackRef.current) {
        cursorRef.current = Math.min(trackRef.current.timeMs, durMs);
        setCursorMs(cursorRef.current);
      }
      playingRef.current = false;
      setPlaying(false);
      return;
    }
    const t = trackRef.current;
    if (t && Math.abs(t.timeMs - cursorRef.current) < 5) {
      await t.resume(); // 일시정지 지점 그대로 — 재예약 없이 이어 재생
    } else {
      await t?.stop();
      const nt = createTrack(trackOf(songId));
      nt.setVolume(0.6);
      trackRef.current = nt;
      await nt.start(cursorRef.current);
    }
    playingRef.current = true;
    setPlaying(true);
  };

  const seekTo = async (ms: number) => {
    const clamped = Math.max(0, Math.min(durMs, ms));
    cursorRef.current = clamped;
    setCursorMs(clamped);
    if (playingRef.current) {
      const nt = createTrack(trackOf(songId));
      nt.setVolume(0.6);
      const old = trackRef.current;
      trackRef.current = nt;
      await old?.stop();
      await nt.start(clamped);
    } else {
      await trackRef.current?.stop();
      trackRef.current = null;
    }
  };

  // ─── 노트 편집 ─────────────────────────────────────────────

  /** 정렬·선택 유지 후 반영 — 재정렬로 바뀐 노트 인덱스를 돌려준다 (드래그 추적용) */
  const applyNotes = (notes: ChartNote[], keep: ChartNote | null): number | null => {
    const c = chartRef.current;
    if (!c) return null;
    const sorted = [...notes].sort((a, b) => a.t - b.t);
    const idx = keep ? sorted.indexOf(keep) : null;
    setChart({ ...c, notes: sorted });
    setSelected(idx);
    setDirty(true);
    return idx;
  };

  /** 판정 노트(비함정)끼리 750ms 하한 — self 제외하고 충돌 검사 */
  const gapClash = (t: number, self: ChartNote | null): ChartNote | undefined =>
    chartRef.current?.notes.find(
      (n) => n !== self && n.type !== 'decoy' && Math.abs(n.t - t) < MIN_GAP_MS,
    );

  const addNoteAt = (nx: number, ny: number) => {
    const c = chartRef.current;
    if (!c) return;
    const t = snapT(cursorRef.current);
    let note: ChartNote;
    if (toolRef.current === 'pose') {
      note = { t, type: 'pose', pose: poseKindRef.current, durationMs: 1000 };
    } else {
      const y = Math.min(Y_MAX, Math.max(Y_MIN, ny));
      note = { t, type: toolRef.current, x: +nx.toFixed(3), y: +y.toFixed(3) };
      if (toolRef.current === 'decoy') note.label = '다른 단어';
    }
    if (note.type !== 'decoy') {
      const clash = gapClash(t, null);
      if (clash) {
        flash(`추가 불가 — ${fmtBeat(clash.t)} 노트와 ${Math.abs(clash.t - t)}ms (하한 ${MIN_GAP_MS}ms)`);
        return;
      }
    }
    applyNotes([...c.notes, note], note);
    flash(`${note.type} 추가 @ ${fmtBeat(t)}`);
  };

  const updateNoteAt = (i: number | null, patch: Partial<ChartNote>): number | null => {
    const c = chartRef.current;
    if (!c || i === null || !c.notes[i]) return null;
    const next = { ...c.notes[i], ...patch };
    const notes = c.notes.slice();
    notes[i] = next;
    return applyNotes(notes, next);
  };

  const updateSelected = (patch: Partial<ChartNote>) => updateNoteAt(selectedRef.current, patch);

  const nudgeSelected = (dir: -1 | 1) => {
    const c = chartRef.current;
    const i = selectedRef.current;
    if (!c || i === null || !c.notes[i]) return;
    const cur = c.notes[i];
    const t = Math.max(0, Math.min(durMs, Math.round(cur.t + dir * beatMs * snapRef.current)));
    if (cur.type !== 'decoy' && gapClash(t, cur)) {
      flash(`이동 불가 — 다른 판정 노트와 ${MIN_GAP_MS}ms 하한 충돌`);
      return;
    }
    updateSelected({ t });
  };

  const deleteSelected = () => {
    const c = chartRef.current;
    const i = selectedRef.current;
    if (!c || i === null) return;
    applyNotes(c.notes.filter((_, idx) => idx !== i), null);
    flash('노트 삭제됨');
  };

  const hitTest = (nx: number, ny: number): number | null => {
    const c = chartRef.current;
    if (!c) return null;
    const cur = cursorRef.current;
    const px = nx * FIELD_W;
    const py = ny * FIELD_H;
    let best: number | null = null;
    let bestD = Infinity;
    c.notes.forEach((n, i) => {
      if (n.x === undefined || n.y === undefined) {
        // pose 노트 — 상단 배너 영역(drawField와 동일 rect)으로 선택
        const shown = cur >= n.t - APPROACH_MS && cur <= n.t + (n.durationMs ?? 1000);
        if (shown && Math.abs(px - FIELD_W / 2) < 70 && py >= 24 && py <= 50) {
          const d = Math.abs(n.t - cur); // 배너가 겹치면 커서에 가까운 포즈
          if (d < bestD) {
            best = i;
            bestD = d;
          }
        }
        return;
      }
      const visible =
        (n.t >= cur - 400 && n.t <= cur + APPROACH_MS) || i === selectedRef.current;
      if (!visible) return;
      const d = Math.hypot(px - n.x * FIELD_W, py - n.y * FIELD_H);
      if (d < NOTE_R + 6 && d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  // ─── 필드 드래그: 노트 위에서 누르면 끌어서 이동, 빈 곳 클릭이면 추가 ───

  const dragRef = useRef<{ index: number | null; moved: boolean; sx: number; sy: number } | null>(
    null,
  );

  const fieldPos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      nx: (e.clientX - rect.left) / rect.width,
      ny: (e.clientY - rect.top) / rect.height,
    };
  };

  const onFieldDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const { nx, ny } = fieldPos(e);
    const hit = hitTest(nx, ny);
    if (hit !== null) setSelected(hit);
    dragRef.current = { index: hit, moved: false, sx: e.clientX, sy: e.clientY };
    // 캔버스 밖으로 나가도 드래그가 이어지도록 포인터 캡처
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onFieldMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    if (!d || d.index === null) return;
    if (chartRef.current?.notes[d.index]?.x === undefined) return; // pose 노트는 좌표 없음 — 드래그 대상 아님
    // 4px 이하 흔들림은 클릭으로 취급 (드래그 시작 판정)
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 4) return;
    d.moved = true;
    e.currentTarget.style.cursor = 'grabbing';
    const { nx, ny } = fieldPos(e);
    updateNoteAt(d.index, {
      x: +Math.min(0.95, Math.max(0.05, nx)).toFixed(3),
      y: +Math.min(Y_MAX, Math.max(Y_MIN, ny)).toFixed(3),
    });
  };

  const onFieldUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    e.currentTarget.style.cursor = '';
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!d || d.moved) return; // 드래그 이동은 move에서 이미 반영됨
    if (d.index === null) {
      const { nx, ny } = fieldPos(e);
      addNoteAt(nx, ny); // 빈 곳 클릭 = 추가 (노트 위 클릭은 down에서 선택됨)
    }
  };

  // ─── 타임라인 드래그: 노트 틱을 끌면 시간(t) 이동, 빈 곳 클릭 = 시크 ───

  const tlDragRef = useRef<{ index: number; moved: boolean; sx: number } | null>(null);

  /** 타임라인에서 포인터 아래 노트 틱 찾기 (CSS 픽셀 기준 ±6px) */
  const timelineHit = (e: React.PointerEvent<HTMLCanvasElement>): number | null => {
    const c = chartRef.current;
    if (!c || durMs === 0) return null;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    let best: number | null = null;
    let bestD = 6;
    c.notes.forEach((n, i) => {
      const d = Math.abs(px - (n.t / durMs) * rect.width);
      if (d < bestD) {
        best = i;
        bestD = d;
      }
    });
    return best;
  };

  const onTimelineDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const hit = timelineHit(e);
    if (hit === null) {
      tlDragRef.current = null;
      return;
    }
    setSelected(hit);
    tlDragRef.current = { index: hit, moved: false, sx: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onTimelineMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = tlDragRef.current;
    if (!d) return;
    if (!d.moved && Math.abs(e.clientX - d.sx) < 4) return;
    d.moved = true;
    e.currentTarget.style.cursor = 'grabbing';
    const rect = e.currentTarget.getBoundingClientRect();
    const t = snapT(((e.clientX - rect.left) / rect.width) * durMs);
    const cur = chartRef.current?.notes[d.index];
    if (!cur || cur.t === t) return;
    if (cur.type !== 'decoy' && gapClash(t, cur)) {
      flash(`이동 불가 — 다른 판정 노트와 ${MIN_GAP_MS}ms 하한 충돌`);
      return;
    }
    // 다른 노트를 넘어가면 재정렬로 인덱스가 바뀐다 — 반환값으로 계속 추적
    const ni = updateNoteAt(d.index, { t });
    if (ni !== null) d.index = ni;
  };

  const onTimelineUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = tlDragRef.current;
    tlDragRef.current = null;
    e.currentTarget.style.cursor = '';
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    if (d) {
      if (d.moved) {
        const n = chartRef.current?.notes[d.index];
        if (n) flash(`시간 이동 — ${fmtBeat(n.t)}`);
      }
      return; // 노트 클릭/드래그는 시크하지 않는다
    }
    const rect = e.currentTarget.getBoundingClientRect();
    void seekTo(((e.clientX - rect.left) / rect.width) * durMs);
  };

  // ─── 키보드 ────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        void togglePlay();
      } else if (e.key === '1') setTool('catch');
      else if (e.key === '2') setTool('decoy');
      else if (e.key === '3') {
        setTool('pose');
        setPoseKind('hands_up');
      } else if (e.key === '4') {
        setTool('pose');
        setPoseKind('heart');
      } else if (e.key === 'Delete' || e.key === 'Backspace') deleteSelected();
      else if (e.key === 'ArrowLeft') void seekTo(cursorRef.current - beatMs * snapRef.current);
      else if (e.key === 'ArrowRight') void seekTo(cursorRef.current + beatMs * snapRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, durMs]);

  // ─── 렌더 루프 (필드 + 타임라인) ────────────────────────────

  useEffect(() => {
    if (!song) return;
    let raf = 0;
    const loop = () => {
      const tr = trackRef.current;
      if (playingRef.current && tr) {
        cursorRef.current = Math.min(tr.timeMs, durMs);
        setCursorMs(cursorRef.current);
        if (tr.ended) {
          playingRef.current = false;
          setPlaying(false);
        }
      }
      drawField();
      drawTimeline();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, durMs]);

  const drawField = () => {
    const cv = fieldRef.current;
    const ctx = cv?.getContext('2d');
    const c = chartRef.current;
    if (!cv || !ctx || !c) return;
    const cur = cursorRef.current;

    ctx.clearRect(0, 0, FIELD_W, FIELD_H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, FIELD_W, FIELD_H);

    // 유효 밴드
    ctx.fillStyle = 'rgba(126,224,138,0.05)';
    ctx.fillRect(0, Y_MIN * FIELD_H, FIELD_W, (Y_MAX - Y_MIN) * FIELD_H);
    ctx.strokeStyle = 'rgba(126,224,138,0.4)';
    ctx.setLineDash([4, 4]);
    for (const y of [Y_MIN, Y_MAX]) {
      ctx.beginPath();
      ctx.moveTo(0, y * FIELD_H);
      ctx.lineTo(FIELD_W, y * FIELD_H);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 몸 실루엣 가이드 — 노트가 몸의 어느 높이에 오는지 보이게 (게임은 몸 기준으로 배치한다)
    const shoulderPx = 0.7 * FIELD_W; // 저작 기준 어깨너비
    const cx = FIELD_W / 2;
    const shoulderY = BODY.shoulder * FIELD_H;
    const headR = shoulderPx * 0.31;
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); // 머리
    ctx.arc(cx, (BODY.eye + 0.02) * FIELD_H, headR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath(); // 어깨선 + 몸통
    ctx.moveTo(cx - shoulderPx / 2, shoulderY);
    ctx.lineTo(cx + shoulderPx / 2, shoulderY);
    ctx.moveTo(cx - shoulderPx * 0.42, shoulderY);
    ctx.lineTo(cx - shoulderPx * 0.36, BODY.waist * FIELD_H);
    ctx.moveTo(cx + shoulderPx * 0.42, shoulderY);
    ctx.lineTo(cx + shoulderPx * 0.36, BODY.waist * FIELD_H);
    ctx.stroke();
    ctx.lineWidth = 1;

    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '10px sans-serif';
    for (const [label, y] of [
      ['머리 위 (만세)', Y_MIN],
      ['정수리', BODY.crown],
      ['어깨선', BODY.shoulder],
      ['허리', Y_MAX],
    ] as const) {
      ctx.fillText(label, 6, y * FIELD_H + (y === Y_MIN ? 12 : -3));
    }

    // 노트: 게임과 같은 접근 창(t−2000 → t)에 들어온 것만 + 선택 노트는 항상
    c.notes.forEach((n, i) => {
      const isSel = i === selectedRef.current;
      if (n.x === undefined || n.y === undefined) {
        // pose 노트 — 상단 배너
        if (cur >= n.t - APPROACH_MS && cur <= n.t + (n.durationMs ?? 1000)) {
          ctx.fillStyle = GOLD;
          ctx.globalAlpha = 0.85;
          ctx.fillRect(FIELD_W / 2 - 70, 24, 140, 26);
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#1a1028';
          ctx.font = '700 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(n.pose === 'heart' ? '🫶 하트 포즈' : '🙌 손 올려 포즈', FIELD_W / 2, 41);
          ctx.textAlign = 'left';
        }
        return;
      }
      const inWindow = n.t >= cur - 400 && n.t <= cur + APPROACH_MS;
      if (!inWindow && !isSel) return;

      const x = n.x * FIELD_W;
      const y = n.y * FIELD_H;
      const p = Math.min(1, Math.max(0, (cur - (n.t - APPROACH_MS)) / APPROACH_MS));
      const fade = n.t < cur ? Math.max(0, 1 - (cur - n.t) / 400) : 1;
      ctx.globalAlpha = inWindow ? 0.35 + 0.65 * fade * p : 0.35;

      // 접근 링 (게임 감각 확인용)
      if (inWindow && p < 1) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(x, y, NOTE_R + (1 - p) * 46, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = n.type === 'decoy' ? PURPLE : PINK;
      ctx.beginPath();
      ctx.arc(x, y, NOTE_R, 0, Math.PI * 2);
      ctx.fill();
      if (isSel) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, NOTE_R + 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.lineWidth = 1;
      }
      ctx.fillStyle = '#fff';
      ctx.font = '700 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(n.type === 'decoy' ? (n.label ?? '함정') : c.targetWord, x, y + 4);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    });
  };

  const drawTimeline = () => {
    const cv = tlRef.current;
    const ctx = cv?.getContext('2d');
    const c = chartRef.current;
    if (!cv || !ctx || !c || durMs === 0) return;

    ctx.clearRect(0, 0, TL_W, TL_H);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, TL_W, TL_H);

    // 마디선 (4비트)
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    for (let t = c.offsetMs; t <= durMs; t += beatMs * 4) {
      const x = (t / durMs) * TL_W;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, TL_H);
      ctx.stroke();
    }

    c.notes.forEach((n, i) => {
      const x = (n.t / durMs) * TL_W;
      const h = n.type === 'pose' ? 34 : n.type === 'decoy' ? 16 : 24;
      ctx.strokeStyle =
        i === selectedRef.current ? '#fff' : n.type === 'pose' ? GOLD : n.type === 'decoy' ? PURPLE : PINK;
      ctx.lineWidth = i === selectedRef.current ? 3 : 2;
      ctx.beginPath();
      ctx.moveTo(x, TL_H - 4);
      ctx.lineTo(x, TL_H - 4 - h);
      ctx.stroke();
    });
    ctx.lineWidth = 1;

    // 플레이헤드
    const px = (cursorRef.current / durMs) * TL_W;
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px, 0);
    ctx.lineTo(px, TL_H);
    ctx.stroke();
  };

  // ─── 검증·저장 ─────────────────────────────────────────────

  const validate = (c: Chart): string[] => {
    const out: string[] = [];
    const grid = beatMs * 0.25; // 최소 그리드 — normal 함정 0.25비트까지 허용
    const sorted = [...c.notes].sort((a, b) => a.t - b.t);
    let prev: ChartNote | null = null;
    for (const n of sorted) {
      const at = `${fmtBeat(n.t)} ${n.type}`;
      if (n.t < 0 || n.t > durMs) out.push(`${at}: 곡 범위 밖 (${fmtTime(n.t)})`);
      if (n.type !== 'pose') {
        const m = (((n.t - c.offsetMs) % grid) + grid) % grid;
        if (Math.min(m, grid - m) > 2) out.push(`${at}: 비트 그리드(0.25비트) 벗어남`);
      }
      if (n.x !== undefined && (n.x < 0.05 || n.x > 0.95)) out.push(`${at}: x ${n.x} 화면 여백 침범`);
      if (n.y !== undefined && (n.y < Y_MIN || n.y > Y_MAX)) out.push(`${at}: y ${n.y} 밴드 밖`);
      if (n.type !== 'decoy') {
        if (prev && n.t - prev.t < MIN_GAP_MS)
          out.push(`${fmtBeat(prev.t)}→${fmtBeat(n.t)}: 간격 ${n.t - prev.t}ms < ${MIN_GAP_MS}ms`);
        prev = n;
      }
    }
    if (c.bpm !== song?.bpm) out.push(`채보 BPM(${c.bpm}) ≠ 곡 BPM(${song?.bpm})`);
    return out;
  };

  const doSave = async () => {
    const c = chartRef.current;
    if (!c || saving) return;
    const sorted = { ...c, notes: [...c.notes].sort((a, b) => a.t - b.t) };
    setIssues(validate(sorted)); // 경고는 보여주되 저장은 막지 않는다 — 의도적 예외는 에디터 사용자 판단
    setSaving(true);
    const r = rowRef.current;
    const res = await saveChart(sorted, r ? { id: r.id, version: r.version } : null);
    setSaving(false);
    if (res.error || !res.row) {
      flash(`저장 실패: ${res.error ?? '알 수 없는 오류'}`);
      return;
    }
    setRow(res.row);
    setChart(sorted);
    setDirty(false);
    flash(`저장 완료 — v${res.row.version}, 게임에 즉시 반영됩니다`);
  };

  const download = () => {
    const c = chartRef.current;
    if (!c) return;
    const sorted = { ...c, notes: [...c.notes].sort((a, b) => a.t - b.t) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(sorted, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${songId}-${difficulty}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── 렌더 ──────────────────────────────────────────────────

  if (!song) {
    return (
      <p className="dim">
        곡을 찾을 수 없습니다 (?song= 파라미터 확인) — <Link href="/admin/songs">곡·채보로</Link>
      </p>
    );
  }
  if (loadErr) return <p className="bad">채보 행 조회 실패: {loadErr}</p>;
  if (!chart) return <p className="dim">채보 불러오는 중…</p>;

  const sel = selected !== null ? chart.notes[selected] : null;

  return (
    <>
      <div className="row admin-section" style={{ alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {song.title} <span className="badge">{difficulty}</span>
          </div>
          <div className="dim">
            {Math.round(song.bpm)} BPM · {Math.round(song.durationSec)}초 · 노트{' '}
            {chart.notes.length}개 ·{' '}
            {row ? `v${row.version}` : '신규 채보'}
            {dirty && <strong style={{ color: GOLD }}> · 저장 안 됨</strong>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn secondary small" onClick={() => setIssues(validate(chart))}>
            검증
          </button>
          <button className="btn secondary small" onClick={download}>
            JSON
          </button>
          <button className="btn small" disabled={saving || !dirty} onClick={() => void doSave()}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>

      {msg && <p className="dim editor-msg">{msg}</p>}
      {issues !== null && issues.length === 0 && <p className="ok editor-msg">✓ 규칙 위반 없음</p>}
      {issues !== null && issues.length > 0 && (
        <div className="card admin-section">
          <h2 className="bad">규칙 위반 {issues.length}건 (저장은 가능 — 의도적 예외인지 확인)</h2>
          <ul className="editor-issues">
            {issues.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="editor-main">
        <canvas
          ref={fieldRef}
          width={FIELD_W}
          height={FIELD_H}
          className="editor-field"
          onPointerDown={onFieldDown}
          onPointerMove={onFieldMove}
          onPointerUp={onFieldUp}
        />
        <aside className="editor-side">
          <h2>도구</h2>
          <div className="editor-tools">
            <button className={tool === 'catch' ? 'active' : ''} onClick={() => setTool('catch')}>
              1 캐치
            </button>
            <button className={tool === 'decoy' ? 'active' : ''} onClick={() => setTool('decoy')}>
              2 함정
            </button>
            <button
              className={tool === 'pose' && poseKind === 'hands_up' ? 'active' : ''}
              onClick={() => {
                setTool('pose');
                setPoseKind('hands_up');
              }}
            >
              3 🙌 포즈
            </button>
            <button
              className={tool === 'pose' && poseKind === 'heart' ? 'active' : ''}
              onClick={() => {
                setTool('pose');
                setPoseKind('heart');
              }}
            >
              4 🫶 포즈
            </button>
          </div>

          <h2>스냅</h2>
          <select value={snap} onChange={(e) => setSnap(Number(e.target.value))}>
            <option value={1}>1비트</option>
            <option value={0.5}>0.5비트</option>
            <option value={0.25}>0.25비트 (함정용)</option>
          </select>

          <h2>선택 노트</h2>
          {!sel && <p className="dim">필드의 노트를 클릭해 선택</p>}
          {sel && (
            <div className="editor-selected">
              <div>
                <span className="badge">{sel.type === 'pose' ? `pose ${sel.pose}` : sel.type}</span>{' '}
                {fmtBeat(sel.t)} · {fmtTime(sel.t)}
              </div>
              <div className="row" style={{ justifyContent: 'flex-start' }}>
                <button className="btn secondary small" onClick={() => nudgeSelected(-1)}>
                  ← t−스냅
                </button>
                <button className="btn secondary small" onClick={() => nudgeSelected(1)}>
                  t+스냅 →
                </button>
              </div>
              {sel.type === 'decoy' && (
                <input
                  type="text"
                  value={sel.label ?? ''}
                  placeholder="함정 표시 단어"
                  onChange={(e) => updateSelected({ label: e.target.value })}
                />
              )}
              {sel.type === 'pose' && (
                <select
                  value={sel.pose}
                  onChange={(e) => updateSelected({ pose: e.target.value as PoseKind })}
                >
                  <option value="hands_up">🙌 hands_up</option>
                  <option value="heart">🫶 heart</option>
                </select>
              )}
              {sel.x !== undefined && (
                <p className="dim">
                  x {sel.x} · y {sel.y} — 드래그로 위치 이동
                </p>
              )}
              <button className="btn secondary small" onClick={deleteSelected}>
                삭제 (Del)
              </button>
            </div>
          )}
        </aside>
      </div>

      <div className="editor-transport">
        <button className="btn secondary small" onClick={() => void seekTo(0)}>
          ⏮
        </button>
        <button className="btn small" onClick={() => void togglePlay()}>
          {playing ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        <span className="editor-clock">
          {fmtTime(cursorMs)} / {fmtTime(durMs)} · {fmtBeat(cursorMs)}
        </span>
      </div>

      <canvas
        ref={tlRef}
        width={TL_W}
        height={TL_H}
        className="editor-timeline"
        onPointerDown={onTimelineDown}
        onPointerMove={onTimelineMove}
        onPointerUp={onTimelineUp}
      />

      <p className="dim">
        필드 — 빈 곳 클릭: 추가 · 노트 클릭: 선택 · 드래그: 위치(x/y) 이동. 타임라인 — 빈 곳
        클릭: 시크 · <strong>노트 틱 드래그: 시간(t) 이동 (스냅 적용)</strong>. Space:
        재생/일시정지 · ←/→: 스냅 단위 이동 · Del: 삭제 · 1~4: 도구 전환. 좌표는 클로즈업
        기준(풀바디는 게임이 리매핑).
      </p>
    </>
  );
}
