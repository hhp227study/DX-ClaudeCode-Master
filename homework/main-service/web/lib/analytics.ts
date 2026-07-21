/**
 * GA4 이벤트 수집 (FR-14, prd-detail.md 12장).
 * NEXT_PUBLIC_GA_MEASUREMENT_ID 미설정이면 전부 no-op — 백엔드와 동일한 폴백 원칙.
 * 공통 파라미터(session_id, user_id, device_type, browser)는 track()이 자동 첨부한다.
 * gtag 로더는 첫 track() 호출 때 lazy 주입 — 로드 전 이벤트는 dataLayer에 큐잉되어 유실 없음.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const SESSION_KEY = 'catchrhy.ga.session';

let userId: string | null = null;

/** 로그인 확인 시점(Home)에서 호출 — 이후 모든 이벤트에 user_id 첨부 */
export function setAnalyticsUser(id: string | null): void {
  userId = id;
}

export function track(event: string, params: Record<string, unknown> = {}): void {
  if (!GA_ID || typeof window === 'undefined') return;
  init();
  window.gtag!('event', event, {
    session_id: sessionId(),
    ...(userId ? { user_id: userId } : {}),
    device_type: deviceType(),
    browser: browserName(),
    ...params,
  });
}

function init(): void {
  if (window.gtag) return;
  window.dataLayer = window.dataLayer ?? [];
  window.gtag = function gtag() {
    // GA 공식 스니펫과 동일하게 arguments 객체를 그대로 push해야 처리된다
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ID, { send_page_view: true });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
}

function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2, 12);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'unavailable';
  }
}

const deviceType = (): string =>
  /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';

function browserName(): string {
  const ua = navigator.userAgent;
  if (/edg\//i.test(ua)) return 'edge';
  if (/samsungbrowser/i.test(ua)) return 'samsung';
  if (/chrome|crios/i.test(ua)) return 'chrome';
  if (/safari/i.test(ua)) return 'safari';
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  return 'other';
}
