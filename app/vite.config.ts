import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'logo-mark.png', 'logo-with-name.png'],
      manifest: {
        name: 'Ava Smart Dental',
        short_name: 'Ava',
        description:
          'Clinic management for Filipino dental practices — patients, charting, billing, prescriptions, reports.',
        theme_color: '#7c3aed',
        background_color: '#fbfaff',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        lang: 'en-PH',
        categories: ['medical', 'productivity', 'business'],
        icons: [
          {
            src: '/logo-mark.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/logo-mark.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico,woff,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  css: {
    // Skip walking up to ~/postcss.config.js — we use @tailwindcss/vite, not PostCSS.
    postcss: { plugins: [] },
  },
})
