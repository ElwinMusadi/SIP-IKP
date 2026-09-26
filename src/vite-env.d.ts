/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string
  readonly VITE_APP_ENV?: "development" | "preview" | "production" | "test"
  readonly VITE_API_BASE_PATH?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
