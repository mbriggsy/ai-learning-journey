import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    host: true,
  },
  build: {
    rolldownOptions: {
      input: {
        board: resolve(import.meta.dirname, 'board.html'),
        player: resolve(import.meta.dirname, 'player.html'),
        howtoplay: resolve(import.meta.dirname, 'howtoplay.html'),
      },
    },
  },
})
