import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      // SockJS/STOMP WebSocket endpoint — ws:true enables the HTTP upgrade.
      // Without this the browser tries ws://localhost:5173/ws and fails with
      // "WebSocket is closed before the connection is established".
      '/ws': {
        target: 'http://localhost:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
