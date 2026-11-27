import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // En desarrollo (npm run dev) las llamadas a /api se reenvían al backend Spring Boot.
  // Así el navegador ve todo en el mismo origen (localhost:5173). En producción (Vercel)
  // se usa la URL real del backend definida en VITE_API_URL, y ahí aplica el CORS del backend
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
})
