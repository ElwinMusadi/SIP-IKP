export interface CloudflareEnv {
  APP_ENV: "development" | "preview" | "production"
  DB: D1Database
  R2_BUCKET?: R2Bucket
}
