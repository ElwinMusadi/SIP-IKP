import { createContext } from "react"

export type UserRole = "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"

export interface AuthUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  profession: string
  unitId: string
}

export interface AuthContextValue {
  user: AuthUser | null
  csrfToken: string | null
  isLoading: boolean
  login: (
    username: string,
    password: string,
    rememberMe?: boolean,
  ) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
