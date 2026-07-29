import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/medical-history": "http://localhost:3000",
      "/nutrition": "http://localhost:3000",
    },
  },
})
