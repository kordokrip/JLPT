/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __APP_RELEASE__: string;

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
