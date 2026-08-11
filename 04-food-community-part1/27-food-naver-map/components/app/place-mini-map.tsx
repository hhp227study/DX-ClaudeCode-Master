"use client";
// 상세페이지 미니지도 — DB에 저장된 좌표를 중심으로 마커 하나를 찍어 보여주기만 한다.
// 등록 폼의 PlaceMapPicker와 달리 위치를 고르는 용도가 아니므로 조작은 모두 막는다.
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Spinner } from "@/components/ui/spinner";
import {
  AUTH_FAILURE_MESSAGE,
  DEFAULT_ZOOM,
  MISSING_KEY_MESSAGE,
  NAVER_MAP_KEY_ID,
  loadNaverMaps,
  onNaverMapAuthFailure,
  type NaverMap,
  type NaverMarker,
} from "@/lib/naver-maps";

export type PlaceMiniMapProps = {
  lat: number;
  lng: number;
  /** 마커 툴팁에 쓰는 장소명 */
  name?: string | null;
  /** 지도 높이 클래스 — 기본은 모바일 160px / md 이상 220px */
  className?: string;
};

export function PlaceMiniMap({
  lat,
  lng,
  name,
  className = "h-[160px] md:h-[220px]",
}: PlaceMiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    NAVER_MAP_KEY_ID ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState(NAVER_MAP_KEY_ID ? "" : MISSING_KEY_MESSAGE);

  useEffect(() => {
    if (!NAVER_MAP_KEY_ID) return;

    let cancelled = false;
    let map: NaverMap | null = null;
    let marker: NaverMarker | null = null;

    const unsubscribeAuthFailure = onNaverMapAuthFailure(() => {
      if (cancelled) return;
      setStatus("error");
      setErrorMessage(AUTH_FAILURE_MESSAGE);
    });

    loadNaverMaps()
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        const position = new maps.LatLng(lat, lng);
        map = new maps.Map(containerRef.current, {
          center: position,
          zoom: DEFAULT_ZOOM,
          // 보여주기 전용 — 조작은 전부 끈다
          draggable: false,
          pinchZoom: false,
          scrollWheel: false,
          keyboardShortcuts: false,
          disableDoubleClickZoom: true,
          zoomControl: false,
          scaleControl: false,
          mapDataControl: false,
        });
        marker = new maps.Marker({ position, map, title: name ?? undefined });
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
      marker?.setMap(null);
      marker = null;
      map?.destroy();
      map = null;
    };
  }, [lat, lng, name]);

  return (
    <div
      className={`relative w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-muted)] ${className}`}
    >
      <div ref={containerRef} className="h-full w-full" />

      {status === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--bg-muted)]">
          <Spinner size={20} />
          <span className="text-[12px] text-[var(--text-tertiary)]">지도를 불러오는 중이에요</span>
        </div>
      )}

      {status === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-[var(--bg-muted)] px-6 text-center">
          <Icon name="image" size={24} color="var(--text-tertiary)" />
          <span className="text-[12px] leading-relaxed text-[var(--text-tertiary)]">
            {errorMessage}
          </span>
        </div>
      )}
    </div>
  );
}
