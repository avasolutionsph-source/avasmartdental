import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  css: {
    // Skip walking up to ~/postcss.config.js — we use @tailwindcss/vite, not PostCSS.
    postcss: { plugins: [] },
  },
})
