import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true, // Vite 8 native — honors tsconfig "paths" without a plugin (confirmed in burned/)
  },
  server: {
    host: true, // expose on LAN for phone testing — see landmine on shared networks
  },
})
