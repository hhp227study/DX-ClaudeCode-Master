import { defineConfig } from 'vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

// basic-ssl: getUserMedia는 HTTPS(또는 localhost)에서만 동작하므로
// 폰에서 LAN IP로 접속해 테스트할 수 있도록 자체 서명 인증서를 사용한다.
export default defineConfig({
  plugins: [basicSsl()],
  server: {
    host: true,
    port: 5173,
    // WSL2 + /mnt/c(Windows FS)에서는 inotify가 동작하지 않아 HMR이 죽는다 → 폴링으로 감시
    watch: {
      usePolling: true,
      interval: 500,
    },
  },
});
