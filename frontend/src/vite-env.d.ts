/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  interface Window {
    __vite_env__?: {
      VITE_API_URL?: string
    }
  }
}
