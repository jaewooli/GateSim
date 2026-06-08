import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // 사용하는 리액트 플러그인에 맞게 유지

export default defineConfig({
  // 기존 base 설정은 그대로 유지 (/gatesimulator)
  base: '/gatesimulator/', 
  
  server: {
    // 1. Vite 개발 서버 포트를 5173으로 명시하여 백엔드(8081)와 충돌을 원천 차단합니다.
    port: 5173, 
    
    // 2. 백엔드 코드가 8081을 쓰고 있으므로, target 주소를 8081로 정확히 조준합니다.
    proxy: {
      // 일반 API 요청 프록시
      '/gatesimulator/api': {
        target: 'http://localhost:8081',
        changeOrigin: true,
        secure: false,
      },
      // 실시간 협업 웹소켓 요청 프록시
      '/gatesimulator/ws': {
        target: 'ws://localhost:8081',
        ws: true,
        changeOrigin: true,
      }
    }
  }
});