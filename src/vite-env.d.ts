/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API; vacía = mismo origen (docs/10 §10.4). */
  readonly VITE_API_URL?: string
  /** Configuración pública de Firebase (proyecto lapticon-eba31). */
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  /** "1" solo en `vite --mode e2e`: identidad y chat falsos para las pruebas. */
  readonly VITE_AUTH_FALSA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
