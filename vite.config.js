import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const repoName = 'promptengine'

  return {
    base: mode === 'production' ? `/${repoName}/` : '/',
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
  }
})
