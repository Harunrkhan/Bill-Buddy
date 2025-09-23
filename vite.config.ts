import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/Bill-Buddy/'
  server: {
    port: 5173
  }
})


