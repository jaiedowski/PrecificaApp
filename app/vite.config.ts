import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  base: './', // funciona em qualquer subcaminho (GitHub Pages)
  plugins: [react()],
})
