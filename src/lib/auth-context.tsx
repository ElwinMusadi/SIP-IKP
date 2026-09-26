import { useCallback, useEffect, useState, type ReactNode } from "react"

import { AuthContext, type AuthUser } from "./auth-context-def"

interface SessionResponsePayload {
  data: {
    user: AuthUser
    session: { csrfToken: string }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session")
      if (res.ok) {
        const payload: SessionResponsePayload = await res.json()
        setUser(payload.data.user)
        setCsrfToken(payload.data.session.csrfToken)
      } else {
        setUser(null)
        setCsrfToken(null)
      }
    } catch {
      setUser(null)
      setCsrfToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function initSession() {
      try {
        const res = await fetch("/api/auth/session")
        if (!isMounted) return

        if (res.ok) {
          const payload: SessionResponsePayload = await res.json()
          setUser(payload.data.user)
          setCsrfToken(payload.data.session.csrfToken)
        } else {
          setUser(null)
          setCsrfToken(null)
        }
      } catch {
        if (!isMounted) return
        setUser(null)
        setCsrfToken(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void initSession()

    return () => {
      isMounted = false
    }
  }, [])

  const login = useCallback(async (username: string, password: string, rememberMe = false) => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, rememberMe }),
      })

      if (!res.ok) {
        let errorDetail: string | undefined
        try {
          const problem: unknown = await res.json()
          if (typeof problem === "object" && problem !== null && "detail" in problem) {
            errorDetail = String(problem.detail)
          }
        } catch {
          // ignore JSON parse error
        }
        return {
          success: false,
          error: errorDetail ?? "Gagal masuk. Periksa username dan password Anda.",
        }
      }

      const payload: SessionResponsePayload = await res.json()

      setUser(payload.data.user)
      setCsrfToken(payload.data.session.csrfToken)

      if (rememberMe) {
        localStorage.setItem("remembered_username", username)
      } else {
        localStorage.removeItem("remembered_username")
      }

      return { success: true }
    } catch {
      return {
        success: false,
        error: "Terjadi kesalahan jaringan saat menghubungi server.",
      }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      })
    } finally {
      setUser(null)
      setCsrfToken(null)
    }
  }, [csrfToken])

  return (
    <AuthContext.Provider
      value={{
        user,
        csrfToken,
        isLoading,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
export type { AuthContextValue, AuthUser, UserRole } from "./auth-context-def"
export { AuthContext } from "./auth-context-def"
