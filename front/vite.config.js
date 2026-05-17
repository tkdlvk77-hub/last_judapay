import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,   // 0.0.0.0 바인딩 → 같은 와이파이의 폰에서 IP로 접속 가능
  },
})
