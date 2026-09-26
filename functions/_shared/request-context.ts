import type { AuthSessionContext } from "./session"

export interface RequestContextData extends Record<string, unknown> {
  requestId: string
  auth?: AuthSessionContext | null
}
