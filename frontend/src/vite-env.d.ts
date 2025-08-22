/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SOCKET_URL: string
  readonly VITE_DEBUG_SOCKET: string
  readonly VITE_DEBUG_API_CALLS: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly NODE_ENV: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// Extend Axios types for custom metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number
    }
    _retry?: boolean
    _retryCount?: number
  }
  
  interface AxiosRequestHeaders {
    Authorization?: string
  }
}
