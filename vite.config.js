import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  server: {
    // Por defecto Vite escucha en `localhost`, que en este equipo resuelve sólo
    // a IPv6 ([::1]). Chrome resuelve `localhost` a la IPv4 127.0.0.1 y recibe
    // ERR_CONNECTION_REFUSED. Fijarlo a 127.0.0.1 evita ese desajuste.
    host: '127.0.0.1',
    port: 5173,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.png'],
      manifest: {
        name: 'CoachNode App',
        short_name: 'CoachNode',
        description: 'Plataforma Inteligente para Entrenadores y Alumnos',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})
