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
      includeAssets: [
        'favicon-16.png',
        'favicon-32.png',
        'apple-touch-icon.png',
        'masked-icon.svg',
        'brand-mark.png',
        'brand-hero.png',
        'page-bg-unified.png',
      ],
      manifest: {
        name: 'JLPT · TOPIK Study',
        short_name: 'JLPT·TOPIK',
        description: 'JLPT 일본어와 TOPIK 한국어를 트랙별로 학습하는 오프라인 우선 PWA',
        id: '/',
        dir: 'ltr',
        theme_color: '#F7F0E2',
        background_color: '#F7F0E2',
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
            name: '학습 홈',
            url: '/',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }],
          },
          {
            name: '학습 설정',
            url: '/settings',
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
            label: 'JLPT · TOPIK Study 모바일 화면',
          },
          {
            src: 'screenshots/desktop.png',
            sizes: '1280x720',
            type: 'image/png',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            form_factor: 'wide' as any,
            label: 'JLPT · TOPIK Study 데스크톱 화면',
          },
        ],
        share_target: {
          action: '/add-word',
          method: 'GET',
          enctype: 'application/x-www-form-urlencoded',
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
      '/api': {
        target: process.env.VITE_DEV_API_PROXY_TARGET ?? 'http://localhost:8787',
        changeOrigin: true,
      },
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
