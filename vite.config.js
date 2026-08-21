import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'TezBozor',
        short_name: 'TezBozor',
        description: "Sabzavot, meva va oziq-ovqat — bugun buyurtma, bugun yetkazamiz",
        lang: 'uz',
        start_url: '/',
        display: 'standalone',
        background_color: '#fbf8f1',
        theme_color: '#1b4d3e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  server: {
    watch: {
      // json-server rewrites this on every mutation, and the upload server writes into public/uploads/ —
      // neither is part of the JS module graph, so ignore them to avoid spurious full-page reloads.
      ignored: ['**/db.json', '**/public/uploads/**'],
    },
  },
})
