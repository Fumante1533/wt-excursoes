import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_MERCADO_PAGO_PUBLIC_KEY': JSON.stringify(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY),
    'process.env.VITE_BACKEND_URL': JSON.stringify(process.env.VITE_BACKEND_URL)
  }
})
