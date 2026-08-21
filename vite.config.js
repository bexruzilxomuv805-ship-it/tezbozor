import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // json-server rewrites this on every mutation, and the upload server writes into public/uploads/ —
      // neither is part of the JS module graph, so ignore them to avoid spurious full-page reloads.
      ignored: ['**/db.json', '**/public/uploads/**'],
    },
  },
})
