import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 백엔드(Spring) 주소 — 환경변수로 override 가능
//   - 로컬 (기본):                   http://localhost:8080
//   - 원격 서버 (Spring Boot 직접):  VITE_BACKEND_URL=http://192.168.0.143:8080 npm run dev
//   - 원격 서버 (nginx 경유):        VITE_BACKEND_URL=http://192.168.0.143 npm run dev
//const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:8080'
const BACKEND = process.env.VITE_BACKEND_URL || 'http://localhost:8080'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,   // 0.0.0.0 바인딩 → 같은 와이파이의 폰에서 IP로 접속 가능
    // ─────────────────────────────────────────────────────────
    // Dev proxy
    //   /api/...  → Spring 서버
    //   /ws       → STOMP/WebSocket (서버 추가 시 활성화)
    //
    // 이렇게 하면 클라이언트는 same-origin(localhost:5173) 으로 인식 →
    //   - CORS preflight 불필요
    //   - HttpOnly Cookie 가 정상 송수신됨 (SameSite=Strict 와 호환)
    // ─────────────────────────────────────────────────────────
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: false,
        // 백엔드 응답 쿠키의 domain 을 그대로 사용 (path 만 보존)
        cookieDomainRewrite: '',
      },
      '/ws': {
        target: BACKEND,
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
