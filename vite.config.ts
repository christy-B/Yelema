import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Déploiement sous-chemin (ex. GitHub Pages : /yelema-platform/) via VITE_BASE_PATH.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
})
