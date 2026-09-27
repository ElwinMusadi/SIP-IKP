import { useState, type SyntheticEvent } from "react"
import { IconHeartbeat, IconLock, IconShieldCheck, IconUser } from "@tabler/icons-react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"

interface LocationState {
  from?: { pathname?: string }
}

const QUICK_ACCOUNTS = [
  { label: "Nakes IBS", username: "nakes_ibs", password: "NakesIbs#2026" },
  { label: "Kepala Ruangan", username: "kepala_ruangan", password: "KepalaRuangan#2026" },
  { label: "Komite PMKP", username: "komite_pmkp", password: "KomitePmkp#2026" },
  { label: "Administrator", username: "admin_ibs", password: "AdminIbs#2026" },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [username, setUsername] = useState(() => localStorage.getItem("remembered_username") ?? "")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(Boolean(localStorage.getItem("remembered_username")))
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const state = location.state as LocationState | null
  const redirectTarget = state?.from?.pathname ?? "/"

  const handleSubmit = async (event: SyntheticEvent) => {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const result = await login(username, password, rememberMe)
    setIsSubmitting(false)

    if (result.success) {
      void navigate(redirectTarget, { replace: true })
    } else {
      setErrorMessage(result.error ?? "Kredensial tidak valid.")
    }
  }

  const fillCredential = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setErrorMessage(null)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-sm flex-col justify-center px-4 py-10">
      <div className="flex flex-col gap-6 rounded-xl border bg-card p-7 shadow-xs">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IconHeartbeat className="size-6" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-bold tracking-tight text-foreground">Masuk SIP-IKP IBS</h1>
            <p className="text-xs text-muted-foreground">RSUD Prof. Dr. W. Z. Johannes Kupang</p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground">
            <IconShieldCheck className="size-3.5 text-primary" />
            <span>Dokumen Rahasia · Sesi 15 Menit</span>
          </div>
        </header>

        {/* Error alert */}
        {errorMessage && (
          <div
            aria-live="polite"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {/* Login form */}
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            void handleSubmit(e)
          }}
        >
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="username">
              Username atau NIP
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-muted-foreground">
                <IconUser className="size-4" />
              </span>
              <input
                autoComplete="username"
                className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="username"
                name="username"
                onChange={(e) => {
                  setUsername(e.target.value)
                }}
                placeholder="NIP atau username staf"
                required
                type="text"
                value={username}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-foreground" htmlFor="password">
              Kata Sandi
            </label>
            <div className="relative flex items-center">
              <span className="pointer-events-none absolute left-3 text-muted-foreground">
                <IconLock className="size-4" />
              </span>
              <input
                autoComplete="current-password"
                className="w-full rounded-lg border bg-background py-2 pr-3 pl-9 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="password"
                name="password"
                onChange={(e) => {
                  setPassword(e.target.value)
                }}
                placeholder="Masukkan kata sandi"
                required
                type="password"
                value={password}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <input
              checked={rememberMe}
              className="rounded border-border text-primary focus:ring-primary"
              id="remember"
              onChange={(e) => {
                setRememberMe(e.target.checked)
              }}
              type="checkbox"
            />
            <label className="cursor-pointer text-muted-foreground" htmlFor="remember">
              Ingat username di perangkat ini
            </label>
          </div>

          <Button className="w-full font-semibold" disabled={isSubmitting} size="default" type="submit">
            {isSubmitting ? "Memverifikasi..." : "Masuk ke Sistem"}
          </Button>
        </form>

        {/* Quick access */}
        <section aria-labelledby="quick-access-title" className="rounded-lg border bg-muted/20 p-3">
          <p className="mb-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide" id="quick-access-title">
            Akses Cepat
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {QUICK_ACCOUNTS.map(({ label, username: u, password: p }) => (
              <button
                key={u}
                className="rounded-md border bg-card px-2 py-1.5 text-left transition-colors hover:bg-muted"
                onClick={() => {
                  fillCredential(u, p)
                }}
                type="button"
              >
                <span className="block text-xs font-semibold text-foreground">{label}</span>
                <span className="text-[10px] text-muted-foreground">{u}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
