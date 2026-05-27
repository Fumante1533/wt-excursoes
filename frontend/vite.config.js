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
          // Firebase SDK — chunk separado (cache longo no browser)
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
          // Painel Admin — chunk isolado, só carrega em /admin
          if (id.includes('/admin/')) {
            return 'admin';
          }
          // Mercado Pago SDK
          if (id.includes('@mercadopago') || id.includes('@stripe')) {
            return 'payment';
          }
          // Outras dependências de terceiros
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})
