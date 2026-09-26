import { IconLock } from "@tabler/icons-react"
import { Link, Navigate, Outlet, useLocation } from "react-router"

import { Button } from "@/components/ui/button"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/use-auth"

interface ProtectedRouteProps {
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium">Memverifikasi sesi aman...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center gap-4 p-8 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <IconLock className="size-6" />
        </div>
        <h2 className="text-xl font-semibold">Akses Terbatas</h2>
        <p className="text-sm text-muted-foreground">
          Peran Anda ({user.role}) tidak memiliki wewenang untuk membuka halaman ini. Silakan
          hubungi Kepala Ruangan atau Administrator jika Anda memerlukan akses.
        </p>
        <Button render={<Link to="/" />} variant="outline">
          Kembali ke Beranda
        </Button>
      </div>
    )
  }

  return <Outlet />
}
