import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      devOptions: { enabled: false },
      includeAssets: [
        'assets/icon.png',
        'assets/logo.png',
        'assets/prc1.png',
        'assets/prc2.png',
        'assets/prc3.png',
        'manifest.json',
      ],
      workbox: {
        disableDevLogs: true,
      },
      manifest: {
        name: 'Itajobi Cars Club',
        short_name: 'ItajobiClub',
        description: 'O maior clube de eventos automotivos da região.',
        theme_color: '#18181b',
        background_color: '#18181b',
        display: 'standalone',
        icons: [
          { src: '/assets/icon.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/icon.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],

  build: {
    // Minificação máxima do código em produção
    minify: 'terser',
    terserOptions: {
      compress: {
        // Remove console.log, console.warn etc. do bundle de produção
        drop_console: true,
        drop_debugger: true,
      },
      // Ofusca nomes de variáveis e funções
      mangle: { toplevel: true },
      format: {
        // Remove comentários do bundle final
        comments: false,
      }
    },
    rollupOptions: {
      output: {
        // Code Splitting: separa código do admin em chunk próprio
        // Assim o visitante comum NÃO baixa o painel administrativo
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/');

          if (normalizedId.includes('node_modules')) {
            if (
              normalizedId.includes('node_modules/react') ||
              normalizedId.includes('node_modules/react-dom') ||
              normalizedId.includes('node_modules/react-router') ||
              normalizedId.includes('node_modules/scheduler')
            ) {
              return 'react';
            }

            if (
              normalizedId.includes('node_modules/firebase') ||
              normalizedId.includes('node_modules/@firebase')
            ) {
              return 'firebase';
            }

            if (normalizedId.includes('node_modules/framer-motion')) {
              return 'motion';
            }

            if (normalizedId.includes('node_modules/lucide-react')) {
              return 'icons';
            }

            if (
              normalizedId.includes('node_modules/@mercadopago') ||
              normalizedId.includes('node_modules/@stripe')
            ) {
              return 'payment';
            }

            if (normalizedId.includes('node_modules/qrcode.react')) {
              return 'qrcode';
            }

            if (
              normalizedId.includes('node_modules/html2canvas') ||
              normalizedId.includes('node_modules/css-line-break') ||
              normalizedId.includes('node_modules/text-segmentation')
            ) {
              return 'capture';
            }

            if (normalizedId.includes('node_modules/@zxing')) {
              return 'scanner';
            }

            return 'vendor';
          }

        }
      }
    }
  }
})
