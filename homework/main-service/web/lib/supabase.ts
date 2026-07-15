import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase 클라이언트 (태스크 #5).
 * env 미설정이면 null — 앱 전체가 게스트 전용 모드(localStorage)로 동작한다.
 * 세션은 supabase-js 기본값(localStorage) 유지, OAuth 콜백 해시도 자동 처리.
 */

let client: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  client = url && key ? createClient(url, key) : null;
  return client;
}

/** 백엔드가 설정된 빌드인가 — Login 화면 노출/세션 분기에 사용 */
export const hasBackend = (): boolean => getSupabase() !== null;
