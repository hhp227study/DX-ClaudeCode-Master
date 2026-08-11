"use client";
// 네이버 지도 위치 선택기 — 핀은 컨테이너 중앙에 고정되고 지도가 그 아래에서 움직인다.
// 즉 "선택된 좌표 = 지도 중심"이므로, 지도 이동이 멎을 때(idle) 중심 좌표를 올려보낸다.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import {
  AUTH_FAILURE_MESSAGE,
  DEFAULT_ZOOM,
  MISSING_KEY_MESSAGE,
  NAVER_MAP_KEY_ID,
  SEOUL_CITY_HALL,
  loadNaverMaps,
  onNaverMapAuthFailure,
  type Coords,
  type NaverMap,
  type NaverMapListener,
  type NaverMaps,
} from "@/lib/naver-maps";

/** 중심이 바뀐 원인 — 사용자가 지도를 움직였는지, center prop으로 옮긴 것인지 */
export type CenterChangeSource = "user" | "program";

export type PlaceMapPickerProps = {
  /**
   * 지도를 옮길 목표 중심.
   * **참조가 바뀔 때만** 지도를 다시 중심에 맞춘다 — 사용자가 드래그한 위치를 매 렌더 되돌리지 않으려는
   * 의도이므로, 부모는 "이 좌표로 옮겨라"라고 지시할 때만 새 객체를 넘겨야 한다(렌더 중 리터럴 금지).
   */
  center?: Coords;
  /**
   * 지도 이동이 멈출 때마다 현재 중심(=핀) 좌표를 알려준다.
   * source가 "user"일 때만 사용자가 직접 움직인 것이다 — 검색 결과 선택으로 프로그램이 옮긴 경우까지
   * 주소를 다시 조회하면 방금 고른 주소를 덮어쓰게 되므로 호출부가 구분할 수 있어야 한다.
   */
  onCenterChange?: (coords: Coords, source: CenterChangeSource) => void;
  /** 지도 높이 클래스 — 기본은 모바일 200px / md 이상 260px */
  className?: string;
};

export function PlaceMapPicker({
  center = SEOUL_CITY_HALL,
  onCenterChange,
  className = "h-[200px] md:h-[260px]",
}: PlaceMapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const mapsRef = useRef<NaverMaps | null>(null);
  // 지도 생성 시점에 쓸 최신 중심 — 스크립트 로딩 중에 선택이 들어와도 놓치지 않는다
  const pendingCenterRef = useRef<Coords>(center);
  // 다음 idle이 사용자 조작에서 온 것인지 표시하는 1회용 플래그
  const userMovedRef = useRef(false);

  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    NAVER_MAP_KEY_ID ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(NAVER_MAP_KEY_ID ? "" : MISSING_KEY_MESSAGE);
  const [dragging, setDragging] = useState(false);

  // 부모가 인라인 함수를 넘겨도 지도를 재생성하지 않도록 콜백은 ref로 최신값만 유지한다
  const onCenterChangeRef = useRef(onCenterChange);
  useEffect(() => {
    onCenterChangeRef.current = onCenterChange;
  }, [onCenterChange]);

  // 지도는 한 번만 만든다
  useEffect(() => {
    if (!NAVER_MAP_KEY_ID) return;

    let cancelled = false;
    const listeners: NaverMapListener[] = [];

    const unsubscribeAuthFailure = onNaverMapAuthFailure(() => {
      if (cancelled) return;
      setStatus("error");
      setErrorMessage(AUTH_FAILURE_MESSAGE);
    });

    loadNaverMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;

        const initial = pendingCenterRef.current;
        const map = new maps.Map(containerRef.current, {
          center: new maps.LatLng(initial.lat, initial.lng),
          zoom: DEFAULT_ZOOM,
          draggable: true,
          pinchZoom: true,
          // 폼 중간에 놓이는 지도라 휠은 페이지 스크롤에 양보하고, 확대는 컨트롤·핀치로 한다
          scrollWheel: false,
          keyboardShortcuts: false,
          zoomControl: true,
          zoomControlOptions: { position: maps.Position.RIGHT_BOTTOM },
          scaleControl: false,
          mapDataControl: false,
        });
        mapRef.current = map;
        mapsRef.current = maps;

        // 드래그·줌은 사용자 조작 — 뒤이어 오는 idle 한 번을 "user"로 표시한다.
        // (프로그램이 setCenter로 옮긴 경우엔 이 플래그가 켜지지 않아 "program"으로 전달된다)
        listeners.push(
          maps.Event.addListener(map, "dragstart", () => {
            userMovedRef.current = true;
            setDragging(true);
          }),
        );
        listeners.push(maps.Event.addListener(map, "dragend", () => setDragging(false)));
        listeners.push(
          maps.Event.addListener(map, "zoom_changed", () => {
            userMovedRef.current = true;
          }),
        );
        listeners.push(
          maps.Event.addListener(map, "idle", () => {
            const current = map.getCenter();
            const source: CenterChangeSource = userMovedRef.current ? "user" : "program";
            userMovedRef.current = false;
            onCenterChangeRef.current?.({ lat: current.lat(), lng: current.lng() }, source);
          }),
        );

        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "네이버 지도를 불러오지 못했어요");
      });

    return () => {
      cancelled = true;
      unsubscribeAuthFailure();
      const maps = mapsRef.current;
      if (maps) for (const listener of listeners) maps.Event.removeListener(listener);
      mapRef.current?.destroy();
      mapRef.current = null;
      mapsRef.current = null;
    };
  }, []);

  // center 참조가 바뀌면 그 좌표로 이동 (아직 생성 전이면 생성 시점에 반영된다)
  useEffect(() => {
    pendingCenterRef.current = center;
    const map = mapRef.current;
    const maps = mapsRef.current;
    if (!map || !maps) return;
    map.setCenter(new maps.LatLng(center.lat, center.lng));
  }, [center]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {status === "ready" && (
        <>
          {/* 중심 고정 핀 — 지도 위에 떠 있을 뿐이므로 포인터 이벤트는 지도로 그대로 흘려보낸다 */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 transition-transform duration-150"
            style={{ transform: `translate(-50%, ${dragging ? "calc(-100% - 8px)" : "-100%"})` }}
          >
            <CenterPin />
          </div>
          {/* 핀 끝이 가리키는 실제 중심점 */}
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-10 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-black/35"
          />
          <p className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--bg-page)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] shadow-sm">
            지도를 움직여 핀을 맞춰주세요
          </p>
        </>
      )}

      {status === "loading" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-[var(--bg-muted)]">
          <Spinner size={20} />
          <span className="text-[12px] text-[var(--text-tertiary)]">지도를 불러오는 중이에요</span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1.5 bg-[var(--bg-muted)] px-6 text-center">
          <Icon name="image" size={24} color="var(--text-tertiary)" />
          <span className="text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            {errorMessage}
          </span>
        </div>
      )}
    </div>
  );
}

/** 물방울 모양 중심 핀 — 뾰족한 아래 끝이 좌표를 가리키도록 bottom을 기준점으로 놓는다 */
function CenterPin() {
  return (
    <svg width="28" height="38" viewBox="0 0 28 38" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M14 1c7.18 0 13 5.82 13 13 0 8.42-10.36 20.2-12.2 22.23a1.08 1.08 0 0 1-1.6 0C11.36 34.2 1 22.42 1 14 1 6.82 6.82 1 14 1Z"
        fill="var(--primary)"
        stroke="#fff"
        strokeWidth="2"
      />
      <circle cx="14" cy="14" r="4.5" fill="#fff" />
    </svg>
  );
}
