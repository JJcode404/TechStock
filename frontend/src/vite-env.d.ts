/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Backend origin; empty means same-origin (relative /api and /uploads). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
