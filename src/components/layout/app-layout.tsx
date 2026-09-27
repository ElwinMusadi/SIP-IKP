import { useState } from "react"
import {
  IconHeartbeat,
  IconHome,
  IconLayoutList,
  IconLogin,
  IconLogout,
  IconMenu2,
  IconShieldCheck,
  IconTableOptions,
  IconUsers,
  IconX,
} from "@tabler/icons-react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"
import type { UserRole } from "@/lib/auth-context"

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case "TENAGA_KESEHATAN":
      return "Tenaga Kesehatan"
    case "KEPALA_RUANGAN":
      return "Kepala Ruangan"
    case "KOMITE_PMKP":
      return "Komite PMKP"
    case "ADMINISTRATOR":
      return "Administrator"
  }
}

interface NavItem {
  label: string
  to: string
  icon: React.ComponentType<{ className?: string }>
}

function getNavItems(role: UserRole | undefined): NavItem[] {
  const base: NavItem[] = [{ label: "Beranda", to: "/", icon: IconHome }]

  if (!role) return base

  if (role === "ADMINISTRATOR") {
    return [
      ...base,
      { label: "Laporan Insiden", to: "/laporan", icon: IconLayoutList },
    { label: "Rekapitulasi", to: "/laporan/rekap", icon: IconTableOptions },
      { label: "Manajemen Pengguna", to: "/admin/users", icon: IconUsers },
    ]
  }

  return [
    ...base,
    { label: "Laporan Insiden", to: "/laporan", icon: IconLayoutList },
    { label: "Rekapitulasi", to: "/laporan/rekap", icon: IconTableOptions },
  ]
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = getNavItems(user?.role)

  const handleLogout = () => {
    setMobileOpen(false)
    void logout().then(() => {
      void navigate("/login")
    })
  }

  const closeMobile = () => {
    setMobileOpen(false)
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        className="sr-only fixed top-3 left-3 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only"
        href="#konten-utama"
      >
        Lewati ke konten utama
      </a>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <NavLink className="flex min-w-0 items-center gap-2.5" to="/">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <IconHeartbeat className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
                SIP-IKP IBS
              </span>
              <span className="hidden truncate text-[11px] text-muted-foreground sm:block">
                RSUD Prof. Dr. W. Z. Johannes Kupang
              </span>
            </span>
          </NavLink>

          {/* Desktop nav */}
          <nav aria-label="Navigasi utama" className="hidden items-center gap-0.5 sm:flex">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )
                }
                key={item.to}
                to={item.to}
                end={item.to === "/"}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* Desktop user area */}
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <div className="flex items-center gap-2.5">
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {user.fullName}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {getRoleLabel(user.role)}
                    {user.unitId ? ` · ${user.unitId}` : ""}
                  </span>
                </div>
                <Button
                  className="gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                  size="sm"
                  variant="outline"
                >
                  <IconLogout className="size-3.5" />
                  <span>Keluar</span>
                </Button>
              </div>
            ) : (
              <Button className="gap-1.5 font-medium" render={<Link to="/login" />} size="sm">
                <IconLogin className="size-3.5" />
                <span>Masuk Staf</span>
              </Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <Button
            aria-controls="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label="Buka navigasi"
            className="sm:hidden"
            onClick={() => {
              setMobileOpen(true)
            }}
            size="icon"
            variant="ghost"
          >
            <IconMenu2 className="size-5" />
          </Button>
        </div>
      </header>

      {/* ─── Mobile Drawer ─── */}
      {/* Backdrop */}
      {mobileOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-40 bg-black/40 sm:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Drawer panel */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-label="Menu navigasi"
        aria-modal="true"
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-72 flex-col bg-card shadow-xl transition-transform duration-200 sm:hidden",
          mobileOpen ? "translate-x-0" : "translate-x-full",
        )}
        onKeyDown={(e) => {
          if (e.key === "Escape") closeMobile()
        }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
            >
              <IconHeartbeat className="size-4" />
            </span>
            <span className="text-sm font-semibold text-foreground">SIP-IKP IBS</span>
          </div>
          <Button
            aria-label="Tutup menu"
            onClick={closeMobile}
            size="icon"
            variant="ghost"
            className="size-8"
          >
            <IconX className="size-4" />
          </Button>
        </div>

        {/* User info */}
        {user && (
          <div className="border-b px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">
              {getRoleLabel(user.role)}
              {user.unitId ? ` · ${user.unitId}` : ""}
            </p>
          </div>
        )}

        {/* Nav links */}
        <nav aria-label="Navigasi mobile" className="flex-1 overflow-y-auto px-3 py-3">
          <ul className="flex flex-col gap-0.5">
            {navItems.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === "/"}
                  onClick={closeMobile}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer actions */}
        <div className="border-t px-3 py-3">
          {user ? (
            <button
              className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
              type="button"
            >
              <IconLogout className="size-4 shrink-0" />
              <span>Keluar dari Sistem</span>
            </button>
          ) : (
            <NavLink
              to="/login"
              onClick={closeMobile}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
            >
              <IconLogin className="size-4 shrink-0" />
              <span>Masuk Staf</span>
            </NavLink>
          )}
        </div>
      </div>

      {/* ─── Main content ─── */}
      <main id="konten-utama">
        <Outlet />
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Sistem Informasi Pelaporan Insiden Keselamatan Pasien — IBS RSUD Prof. Dr. W. Z.
            Johannes Kupang
          </p>
          <p className="flex items-center gap-1.5">
            <IconShieldCheck aria-hidden="true" className="size-3.5 text-primary" />
            <span>Kerahasiaan data medis dilindungi RBAC &amp; jejak audit.</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
