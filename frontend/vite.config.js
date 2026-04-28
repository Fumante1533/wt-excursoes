import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Itajobi Cars Club',
        short_name: 'ItajobiClub',
        description: 'O maior clube de eventos automotivos da região.',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        icons: [
          {
            src: '/assets/icon.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/assets/icon.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  define: {
    'process.env.VITE_MERCADO_PAGO_PUBLIC_KEY': JSON.stringify(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY),
    'process.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL)
  }
})
