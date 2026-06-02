import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

const enablePwaDevWorker = process.env.VITE_PWA_DEV_SW !== 'false';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: enablePwaDevWorker ? 'auto' : false,
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'JLPT N3 일본어 학습',
        short_name: '일본어 N3',
        description: 'JLPT N3 오프라인 우선 일본어 학습 PWA',
        id: '/',
        dir: 'ltr',
        theme_color: '#B91C1C',
        background_color: '#FAFAF7',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        scope: '/',
        start_url: '/',
        orientation: 'portrait-primary',
        lang: 'ko',
        categories: ['education', 'productivity'],
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
        shortcuts: [
          {
            name: '오늘의 복습',
            url: '/review',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: '어휘 검색',
            url: '/browse/vocab',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
        ],
        screenshots: [
          {
            src: 'screenshots/mobile.png',
            sizes: '540x720',
            type: 'image/png',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form_factor: 'narrow' as any,
            label: 'JLPT N3 모바일 화면',
          },
          {
            src: 'screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form_factor: 'wide' as any,
            label: 'JLPT N3 데스크톱 화면',
          },
        ],
        share_target: {
          action: '/add-word',
          method: 'GET',
          params: { text: 'text', title: 'title', url: 'url' },
        },
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: { enabled: true, type: 'module' },
    }),
  ],
  css: {
    postcss: { plugins: [tailwindcss, autoprefixer] },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8787', changeOrigin: true },
    },
  },
  resolve: {
    alias: { '@': '/src' },
  },
  build: {
    target: 'es2020',
    cssTarget: 'safari14',
    rollupOptions: {
      treeshake: {
        moduleSideEffects: false,
      },
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-query':  ['@tanstack/react-query'],
          'vendor-db':     ['dexie', 'dexie-react-hooks'],
          'vendor-state':  ['zustand'],
        },
      },
    },
  },
});
