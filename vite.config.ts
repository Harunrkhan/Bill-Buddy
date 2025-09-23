// @ts-nocheck
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: '/Bill-Buddy/',
  plugins: [react()],
  server: {
    port: 5173
  }
})


