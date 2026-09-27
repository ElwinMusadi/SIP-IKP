import { useState, type SyntheticEvent } from "react"
import {
  IconAlertCircle,
  IconHeartbeat,
  IconLock,
  IconShieldCheck,
  IconUser,
} from "@tabler/icons-react"
import { useLocation, useNavigate } from "react-router"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"
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

  return (
    <div className="mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 gap-0 px-4 py-8 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:px-8 lg:py-12">
      {/* ─── Panel konteks (desktop) ─── */}
      <section
        aria-hidden="true"
        className="hidden flex-col gap-8 rounded-2xl bg-primary/[0.06] p-10 lg:flex"
      >
        <div className="flex flex-col gap-3">
          <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <IconHeartbeat className="size-6" />
          </span>
          <h2 className="max-w-md text-2xl font-semibold tracking-tight text-foreground text-balance">
            Sistem Informasi Pelaporan Insiden Keselamatan Pasien
          </h2>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            Instalasi Bedah Sentral — RSUD Prof. Dr. W. Z. Johannes Kupang. Laporkan insiden,
            pantau tindak lanjut, dan dukung budaya keselamatan pasien.
          </p>
        </div>
        <ul className="flex flex-col gap-4 border-t border-primary/10 pt-6">
          <li className="flex items-start gap-3 text-sm text-foreground">
            <IconShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Akses berbasis peran dengan jejak audit penuh untuk setiap perubahan laporan.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-foreground">
            <IconHeartbeat aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              Alur terstruktur: pelaporan, verifikasi kepala ruangan, penilaian risiko, hingga
              tinjauan Komite PMKP.
            </span>
          </li>
          <li className="flex items-start gap-3 text-sm text-foreground">
            <IconLock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>Kerahasiaan data pasien terjaga sesuai ketentuan rekam medis.</span>
          </li>
        </ul>
      </section>

      {/* ─── Kartu login ─── */}
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6 lg:max-w-none lg:pl-4">
        <header className="flex flex-col items-center gap-3 text-center lg:items-start lg:text-left">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
            <IconHeartbeat className="size-6" />
          </span>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Masuk ke SIP-IKP IBS
            </h1>
            <p className="text-sm text-muted-foreground">
              Gunakan akun staf yang diterbitkan oleh administrator sistem.
            </p>
          </div>
        </header>

        {errorMessage && (
          <Alert
            className="border-destructive/30 bg-destructive/5"
            role="alert"
            variant="destructive"
          >
            <IconAlertCircle />
            <AlertDescription className="text-destructive">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <form
          className="flex flex-col gap-5 rounded-xl border bg-card p-6 shadow-xs sm:p-7"
          onSubmit={(event) => {
            void handleSubmit(event)
          }}
        >
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="username">Nama Pengguna atau NIP</FieldLabel>
              <InputGroup className="h-10">
                <InputGroupAddon align="inline-start">
                  <IconUser />
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete="username"
                  id="username"
                  name="username"
                  onChange={(event) => {
                    setUsername(event.target.value)
                  }}
                  placeholder="NIP atau nama pengguna staf"
                  required
                  type="text"
                  value={username}
                />
              </InputGroup>
            </Field>

            <Field>
              <FieldLabel htmlFor="password">Kata Sandi</FieldLabel>
              <InputGroup className="h-10">
                <InputGroupAddon align="inline-start">
                  <IconLock />
                </InputGroupAddon>
                <InputGroupInput
                  autoComplete="current-password"
                  id="password"
                  name="password"
                  onChange={(event) => {
                    setPassword(event.target.value)
                  }}
                  placeholder="Masukkan kata sandi"
                  required
                  type="password"
                  value={password}
                />
              </InputGroup>
            </Field>

            <label
              className="flex min-h-10 cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none"
              htmlFor="remember"
            >
              <Checkbox
                checked={rememberMe}
                id="remember"
                name="remember"
                onCheckedChange={(checked) => {
                  setRememberMe(checked)
                }}
              />
              Ingat nama pengguna di perangkat ini
            </label>
          </FieldGroup>

          <Button className="w-full font-semibold" disabled={isSubmitting} size="lg" type="submit">
            {isSubmitting && <Spinner data-icon="inline-start" />}
            {isSubmitting ? "Memverifikasi…" : "Masuk"}
          </Button>
        </form>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <IconShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
          Sesi berakhir otomatis setelah tidak aktif. Data akses tercatat dalam jejak audit.
        </p>
      </div>
    </div>
  )
}
