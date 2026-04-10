import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

const repository = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? 'QuietScribe-Web-Granite'
const base = process.env.GITHUB_ACTIONS === 'true' ? `/${repository}/` : '/'

export default defineConfig({
  base,
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'service-worker.ts',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,wasm,json}']
      },
      manifest: {
        id: './',
        name: 'Quiet Scribe',
        short_name: 'QuietScribe',
        description: 'Offline-first browser transcription app optimised for local AI inference.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f7f8fa',
        theme_color: '#f7f8fa',
        lang: 'en-AU',
        orientation: 'portrait-primary',
        categories: ['productivity', 'utilities', 'business'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ]
})
