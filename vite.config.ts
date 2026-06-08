import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react'; // 사용하는 리액트 플러그인에 맞게 유지

export default defineConfig({
  plugins:[react()],
  base: '/gatesimulator/', 
  
  server: {
    port: 5173, 
    
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
