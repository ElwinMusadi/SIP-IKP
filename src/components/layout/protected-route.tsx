import { IconLock } from "@tabler/icons-react"
import { Link, Navigate, Outlet, useLocation } from "react-router"

import { InlineLoader } from "@/components/shared/loading-states"
import { Button } from "@/components/ui/button"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/use-auth"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

const ROLE_LABELS: Record<UserRole, string> = {
  TENAGA_KESEHATAN: "Tenaga Kesehatan",
  KEPALA_RUANGAN: "Kepala Ruangan",
  KOMITE_PMKP: "Komite PMKP",
  ADMINISTRATOR: "Administrator",
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <InlineLoader label="Memverifikasi sesi aman…" />
      </div>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
        <span className="flex size-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
          <IconLock className="size-6" />
        </span>
        <h2 className="text-xl font-semibold tracking-tight">Akses terbatas</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Peran Anda ({ROLE_LABELS[user.role]}) tidak memiliki wewenang untuk membuka halaman ini.
          Hubungi Administrator jika Anda memerlukan akses.
        </p>
        <Button render={<Link to="/" />} size="sm" variant="outline">
          Kembali ke Beranda
        </Button>
      </div>
    )
  }

  return <Outlet />
}
