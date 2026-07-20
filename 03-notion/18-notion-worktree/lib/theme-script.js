// 서버 컴포넌트(layout.jsx)에서 임포트되므로 React 훅을 두지 않는다.
// 클라이언트 훅은 lib/theme.js 참조.
export const THEME_KEY = "mini-notion-theme";

// first paint 전 <head>에서 동기 실행되는 스크립트 소스 (layout.jsx가 주입)
// 저장값이 유효하면 우선, 없으면 기기 설정(prefers-color-scheme)을 따른다.
// 기기 설정으로 정한 초기값은 저장하지 않는다 — "선택 안 함" 상태 보존.
export function getInitialThemeScript() {
  return (
    "(function(){var t=null;" +
    'try{t=localStorage.getItem("' + THEME_KEY + '");}catch(e){}' +
    'if(t!=="light"&&t!=="dark"){' +
    'try{t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";}' +
    'catch(e){t="light";}}' +
    "document.documentElement.dataset.theme=t;})();"
  );
}
