import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // itch.io 등 정적 호스팅(iframe 하위 경로)에서 동작하도록 상대 경로 사용
  base: './',
  server: {
    port: 5173,
    // Spring Boot 백엔드 연동 시 프록시 설정
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
});
