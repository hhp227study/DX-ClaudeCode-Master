// PlaceRow(DB 행) → 화면·API 응답용 DTO 변환 — BFF 라우트와 서버 컴포넌트가 공유한다.
import { resolveImageUrl } from "@/lib/auth/supabase";
import type { PlaceRow } from "./supabase";
import { parseCoordinate } from "./validation";

export type PlaceImageDto = {
  id: string;
  url: string;
};

export type PlaceDto = {
  id: string;
  title: string;
  content: string;
  /** 지번주소 */
  address: string;
  /** 장소명 — 지도 정보 필수화 이전에 등록된 글은 null */
  name: string | null;
  /** WGS84 좌표 — 둘 다 있을 때만 지도를 그린다 */
  lat: number | null;
  lng: number | null;
  createdAt: string;
  userId: string | null;
  /** 작성자 닉네임 — 프로필이 없으면 "이웃" */
  author: string;
  /** 표시 순서대로 정렬된 이미지 (1장 이상 보장) */
  images: PlaceImageDto[];
};

export function toPlaceDto(row: PlaceRow, nicknames: Map<string, string>): PlaceDto {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    address: row.address,
    name: row.name,
    // PostgREST가 float8을 문자열로 줄 수 있어 숫자로 정규화한다
    lat: parseCoordinate(row.lat, 90),
    lng: parseCoordinate(row.lng, 180),
    createdAt: row.created_at,
    userId: row.user_id,
    author: (row.user_id && nicknames.get(row.user_id)) || "이웃",
    images: row.place_image
      .map((img) => ({ id: img.id, url: resolveImageUrl(img.image_path) ?? "" }))
      .filter((img) => img.url),
  };
}

/** 카드 메타용 상대 시간 (예: "2일 전") */
export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}일 전`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}주 전`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}개월 전`;
  return `${Math.floor(days / 365)}년 전`;
}

/** 상세페이지 작성일 (예: "2026년 7월 22일") */
export function formatPostedDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
