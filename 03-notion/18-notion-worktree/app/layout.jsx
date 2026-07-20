import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { getInitialThemeScript } from "@/lib/theme-script";

export const metadata = {
  title: "미니 노션",
  description: "나만의 가벼운 업무 관리 도구",
};

export default function RootLayout({ children }) {
  return (
    // suppressHydrationWarning: 인라인 스크립트가 first paint 전에 data-theme를
    // 붙이므로 서버 HTML과의 속성 차이는 의도된 것
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* first paint 전에 data-theme를 결정해 반대 테마 깜빡임을 막는다 */}
        <script dangerouslySetInnerHTML={{ __html: getInitialThemeScript() }} />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
