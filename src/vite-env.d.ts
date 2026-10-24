/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API; vacía = mismo origen (docs/10 §10.4). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
