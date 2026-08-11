"use client";
// 상세페이지 사진 캐러셀 — 스크롤 스냅으로 좌우 넘기고 "n / N" 카운터를 갱신한다
import { useRef, useState } from "react";

export type PhotoCarouselProps = {
  urls: string[];
  alt: string;
};

export function PhotoCarousel({ urls, alt }: PhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const onScroll = () => {
    const el = trackRef.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.min(urls.length - 1, Math.round(el.scrollLeft / el.clientWidth)));
  };

  return (
    <div className="relative -mx-4 md:mx-0 md:mt-6">
      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex snap-x snap-mandatory overflow-x-auto bg-[var(--bg-muted)] md:rounded-2xl"
        style={{ scrollbarWidth: "none" }}
      >
        {urls.map((url, i) => (
          // 스토리지 공개 URL — next/image 원격 도메인 설정 없이 그대로 렌더
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={url}
            src={url}
            alt={`${alt} 사진 ${i + 1}`}
            className="h-[280px] w-full flex-none snap-center object-cover md:h-[400px]"
          />
        ))}
      </div>
      <span className="absolute bottom-2.5 right-4 inline-flex h-6 min-w-11 items-center justify-center rounded-xl bg-black/50 px-2 text-[11px] font-medium text-white">
        {index + 1} / {urls.length}
      </span>
    </div>
  );
}
