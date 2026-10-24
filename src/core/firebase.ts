import { getApps, initializeApp, type FirebaseApp } from 'firebase/app'

/**
 * Mismo proyecto de Firebase que la app Flutter (`lapticon-eba31`). La clave
 * web es pública por diseño (la protegen las reglas y el backend), pero no se
 * sube al repositorio: llega por `VITE_FIREBASE_API_KEY` (.env.local en
 * desarrollo, variable de entorno en Cloudflare Pages).
 */
export const configFirebase = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'lapticon-eba31.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'lapticon-eba31',
}

export const hayConfigFirebase = configFirebase.apiKey !== ''

export function appFirebase(): FirebaseApp {
  return getApps()[0] ?? initializeApp(configFirebase)
}
