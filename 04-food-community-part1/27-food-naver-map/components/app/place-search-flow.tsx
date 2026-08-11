"use client";
// 장소 검색 전체화면 플로우 — 등록/수정 폼 위에 덮이므로 폼 상태(사진·이름·내용)는 그대로 살아있다.
// 단계는 [검색] → (결과 없음) [직접입력] 두 단계이고, 단계마다 히스토리 엔트리를 하나씩 쌓아
// 브라우저·하드웨어 뒤로가기가 한 단계씩 되돌아가도록 맞춘다.
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Empty } from "@/components/ui/empty";
import { Icon } from "@/components/ui/icon";
import { IconButton } from "@/components/ui/icon-button";
import { Skeleton } from "@/components/ui/skeleton";
import { TextField } from "@/components/ui/text-field";
import { Toast } from "@/components/ui/toast";
import {
  LOCAL_SEARCH_MAX_RESULTS,
  MIN_QUERY_LENGTH,
  SEARCH_DEBOUNCE_MS,
  type LocalPlace,
  type PlaceSelection,
  toManualSelection,
  toPlaceSelection,
} from "@/lib/places/place-search";

export type PlaceSearchFlowProps = {
  open: boolean;
  /** 검색창 초기값 — 이미 고른 장소가 있으면 그 이름으로 시작한다 */
  initialQuery?: string;
  onClose: () => void;
  onSubmit: (selection: PlaceSelection) => void;
};

/** 열릴 때마다 내부를 새로 마운트해 초기화 로직(effect 안 setState) 없이 상태를 리셋한다 */
export function PlaceSearchFlow({ open, ...props }: PlaceSearchFlowProps) {
  if (!open) return null;
  return <PlaceSearchScreens {...props} />;
}

type Step = "search" | "manual";
/** 어떤 검색어에 대한 결과인지 함께 들고 있어야, 검색어가 바뀐 순간의 이전 결과를 그리지 않는다 */
type SearchOutcome = { query: string; items: LocalPlace[] };
type SearchFailure = { query: string; message: string };

function PlaceSearchScreens({
  initialQuery = "",
  onClose,
  onSubmit,
}: Omit<PlaceSearchFlowProps, "open">) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("search");
  const [query, setQuery] = useState(initialQuery);
  const [outcome, setOutcome] = useState<SearchOutcome | null>(null);
  const [failure, setFailure] = useState<SearchFailure | null>(null);
  const [manualName, setManualName] = useState("");

  // 우리가 쌓은 히스토리 엔트리 개수. StrictMode 이중 실행에도 중복으로 쌓이지 않게 ref로 센다.
  const depthRef = useRef(0);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const pushHistoryStep = () => {
    depthRef.current += 1;
    // URL은 그대로 두고 엔트리만 쌓는다 (Next가 patch한 pushState라 url을 명시하는 편이 안전하다)
    window.history.pushState({ placeSearchFlow: depthRef.current }, "", window.location.href);
  };

  // 첫 진입 엔트리 + 검색창 포커스
  useEffect(() => {
    if (depthRef.current === 0) {
      depthRef.current = 1;
      window.history.pushState({ placeSearchFlow: 1 }, "", window.location.href);
    }
    inputRef.current?.focus();
  }, []);

  // 뒤로가기 → 한 단계씩 되돌리고, 바닥이면 닫는다
  useEffect(() => {
    const onPopState = () => {
      if (depthRef.current <= 0) return;
      depthRef.current -= 1;
      if (depthRef.current === 0) onCloseRef.current();
      else setStep("search");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const trimmed = query.trim();
  const tooShort = trimmed.length < MIN_QUERY_LENGTH;
  // 지금 검색어에 해당하는 결과/실패만 인정하고, 아니면 아직 로딩 중이다
  const matched = outcome?.query === trimmed ? outcome : null;
  const failed = failure?.query === trimmed ? failure : null;
  const loading = !tooShort && !matched && !failed;

  // 디바운스 검색 — 검색어가 바뀌면 진행 중이던 요청은 취소한다
  useEffect(() => {
    if (step !== "search") return;
    const target = query.trim();
    if (target.length < MIN_QUERY_LENGTH) return;

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/place-search?query=${encodeURIComponent(target)}`, {
          signal: controller.signal,
        });
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          setFailure({ query: target, message: data?.error ?? "검색에 실패했어요" });
          return;
        }
        setOutcome({ query: target, items: Array.isArray(data?.items) ? data.items : [] });
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setFailure({ query: target, message: "네트워크 오류로 검색하지 못했어요" });
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [step, query, router]);

  /** 플로우를 끝내며 쌓아둔 엔트리를 한 번에 걷어낸다 */
  const finish = (selection: PlaceSelection) => {
    const depth = depthRef.current;
    depthRef.current = 0;
    onSubmit(selection);
    onClose();
    // 언마운트 후 popstate가 오므로 위 리스너는 이미 떨어져 있다 — 엔트리만 조용히 정리된다
    if (depth > 0) window.history.go(-depth);
  };

  const goBack = () => window.history.back();
  const openManual = () => {
    setManualName(trimmed);
    setStep("manual");
    pushHistoryStep();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[var(--bg-page)]">
      {step === "search" ? (
        <>
          <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]">
            <div className="mx-auto flex w-full max-w-[720px] items-center gap-1 px-2 py-2">
              <IconButton icon="arrow-left" onClick={goBack} />
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-[var(--bg-muted)] px-3.5 py-3">
                <Icon name="search" size={20} color="var(--text-tertiary)" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="가게 이름이나 지역을 입력해주세요"
                  aria-label="장소 검색"
                  className="ds-input min-w-0 flex-1 bg-transparent text-[14px] text-[var(--text-primary)] outline-none"
                />
                {query && (
                  <button type="button" aria-label="검색어 지우기" onClick={() => setQuery("")}>
                    <Icon name="close" size={20} color="var(--text-tertiary)" />
                  </button>
                )}
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-[720px]">
              {tooShort && (
                <p className="px-4 py-6 text-[13px] text-[var(--text-tertiary)]">
                  {MIN_QUERY_LENGTH}글자 이상 입력하면 네이버 지역검색으로 장소를 찾아드려요
                </p>
              )}

              {loading && (
                <ul className="flex flex-col">
                  {Array.from({ length: 3 }, (_, i) => (
                    <li
                      key={i}
                      className="flex flex-col gap-2 border-b border-[var(--border-subtle)] px-4 py-3.5"
                    >
                      <Skeleton variant="text" width="45%" />
                      <Skeleton variant="text" width="70%" />
                    </li>
                  ))}
                </ul>
              )}

              {failed && (
                <div className="px-4 py-4">
                  <Toast status="error" message={failed.message} fullWidth />
                </div>
              )}

              {matched && matched.items.length > 0 && (
                <>
                  <ul className="flex flex-col">
                    {matched.items.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => finish(toPlaceSelection(item))}
                          className="flex w-full flex-col items-start gap-1 border-b border-[var(--border-subtle)] px-4 py-3.5 text-left transition-colors hover:bg-[var(--bg-muted)]"
                        >
                          <span className="flex flex-wrap items-baseline gap-2">
                            <span className="text-[15px] font-bold text-[var(--text-primary)]">
                              {item.name}
                            </span>
                            {item.category && (
                              <span className="text-[11px] text-[var(--text-tertiary)]">
                                {item.category}
                              </span>
                            )}
                          </span>
                          {item.roadAddress && (
                            <span className="text-[13px] text-[var(--text-secondary)]">
                              {item.roadAddress}
                            </span>
                          )}
                          {item.address && (
                            <span className="text-[12px] text-[var(--text-tertiary)]">
                              지번 {item.address}
                            </span>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="px-4 py-3 text-center text-[12px] text-[var(--text-tertiary)]">
                    지역검색은 한 번에 최대 {LOCAL_SEARCH_MAX_RESULTS}건까지 알려줘요 — 찾는 곳이 없으면
                    검색어를 더 자세히 적어보세요
                  </p>
                </>
              )}

              {matched && matched.items.length === 0 && (
                <div className="flex flex-col items-center px-4 py-10">
                  <Empty
                    icon="search"
                    title="검색 결과가 없어요"
                    description={`'${matched.query}' 장소를 찾지 못했어요.\n이름을 직접 입력해 등록할 수 있어요.`}
                    primaryAction={{ label: "직접 입력하기", onClick: openManual }}
                  />
                </div>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <header className="sticky top-0 z-10 border-b border-[var(--border-subtle)] bg-[var(--bg-page)]">
            <div className="mx-auto flex w-full max-w-[720px] items-center gap-1 px-2 py-2">
              <IconButton icon="arrow-left" onClick={goBack} />
              <span className="text-[16px] font-bold text-[var(--text-primary)]">장소 직접 입력</span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 px-4 py-5">
              <TextField
                label="장소명 *"
                leadIcon="edit"
                value={manualName}
                onChange={setManualName}
                placeholder="예: 할머니 손칼국수"
                helper="검색되지 않는 곳은 이름만 먼저 등록할 수 있어요"
                fullWidth
              />
              <p className="text-[12px] leading-relaxed text-[var(--text-tertiary)]">
                주소와 위치는 기본값(등록 대기중 · 서울시청)으로 남습니다. 지도를 직접 움직여 위치를
                고르는 기능은 준비 중이에요.
              </p>
            </div>
          </div>

          <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-page)]">
            <div className="mx-auto w-full max-w-[720px] px-4 pb-4 pt-3">
              <Button
                variant="primary"
                fullWidth
                disabled={!manualName.trim()}
                onClick={() => finish(toManualSelection(manualName))}
              >
                이 이름으로 등록
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
