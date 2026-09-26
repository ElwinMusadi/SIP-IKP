import { useState, type SyntheticEvent } from "react"
import { IconHeartbeat, IconLock, IconShieldCheck, IconUser } from "@tabler/icons-react"
import { useLocation, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"

interface LocationState {
  from?: { pathname?: string }
}

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

  const fillQuickCredential = (user: string, pass: string) => {
    setUsername(user)
    setPassword(pass)
    setErrorMessage(null)
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-md flex-col justify-center px-4 py-8">
      <div className="flex flex-col gap-6 rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
        <header className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs">
            <IconHeartbeat className="size-7" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl font-semibold tracking-tight">Masuk SIP-IKP IBS</h1>
            <p className="text-xs text-muted-foreground">RSUD Prof. Dr. W. Z. Johannes Kupang</p>
          </div>
          <div className="mt-2 flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <IconShieldCheck className="size-4" />
            <span>Dokumen Rahasia &bull; Sesi 15 Menit</span>
          </div>
        </header>

        {errorMessage && (
          <div
            aria-live="polite"
            className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

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
              Kata Sandi (Password)
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

          <div className="flex items-center justify-between text-xs">
            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                checked={rememberMe}
                className="rounded border-muted-foreground/30 text-primary focus:ring-primary"
                onChange={(e) => {
                  setRememberMe(e.target.checked)
                }}
                type="checkbox"
              />
              <span>Ingat Username di Perangkat Ini</span>
            </label>
          </div>

          <Button className="w-full font-medium" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting ? "Memverifikasi..." : "Masuk ke Sistem"}
          </Button>
        </form>

        <section
          aria-labelledby="dev-accounts-title"
          className="rounded-xl border bg-muted/30 p-3 text-xs"
        >
          <p className="font-semibold text-foreground" id="dev-accounts-title">
            Akun Pengembangan &amp; Pengujian:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            <button
              className="rounded-md border bg-card px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                fillQuickCredential("nakes_ibs", "NakesIbs#2026")
              }}
              type="button"
            >
              <span className="block font-medium text-foreground">Nakes IBS</span>
              <span className="text-[10px]">nakes_ibs</span>
            </button>
            <button
              className="rounded-md border bg-card px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                fillQuickCredential("kepala_ruangan", "KepalaRuangan#2026")
              }}
              type="button"
            >
              <span className="block font-medium text-foreground">Kepala Ruangan</span>
              <span className="text-[10px]">kepala_ruangan</span>
            </button>
            <button
              className="rounded-md border bg-card px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                fillQuickCredential("komite_pmkp", "KomitePmkp#2026")
              }}
              type="button"
            >
              <span className="block font-medium text-foreground">Komite PMKP</span>
              <span className="text-[10px]">komite_pmkp</span>
            </button>
            <button
              className="rounded-md border bg-card px-2 py-1.5 text-left text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => {
                fillQuickCredential("admin_ibs", "AdminIbs#2026")
              }}
              type="button"
            >
              <span className="block font-medium text-foreground">Administrator</span>
              <span className="text-[10px]">admin_ibs</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
