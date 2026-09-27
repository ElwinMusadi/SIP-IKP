import { useState } from "react"
import {
  IconChevronDown,
  IconHeartbeat,
  IconHome,
  IconLayoutList,
  IconLogin,
  IconLogout,
  IconMenu2,
  IconPlus,
  IconShieldCheck,
  IconTableOptions,
  IconUsers,
} from "@tabler/icons-react"
import { Link, NavLink, Outlet, useNavigate } from "react-router"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

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

function getInitials(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
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

function canReportIncident(role: UserRole | undefined): boolean {
  return role === "TENAGA_KESEHATAN" || role === "KEPALA_RUANGAN" || role === "KOMITE_PMKP"
}

export function AppLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = getNavItems(user?.role)
  const showReportAction = canReportIncident(user?.role)

  const handleLogout = () => {
    setMobileOpen(false)
    void logout().then(() => {
      void navigate("/login")
    })
  }

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <a
        className="sr-only fixed top-3 left-3 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only"
        href="#konten-utama"
      >
        Lewati ke konten utama
      </a>

      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 border-b bg-card/95 backdrop-blur-sm no-print">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <NavLink className="flex min-h-10 min-w-0 items-center gap-2.5" to="/">
            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
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
          <nav aria-label="Navigasi utama" className="hidden items-center gap-0.5 lg:flex">
            {navItems.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "inline-flex min-h-10 items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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

          {/* Right area */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {user && showReportAction && (
              <Button
                className="hidden sm:inline-flex"
                render={<Link to="/laporan/baru" />}
                size="sm"
              >
                <IconPlus data-icon="inline-start" />
                Lapor Insiden
              </Button>
            )}

            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="flex min-h-10 max-w-44 items-center gap-2 rounded-lg px-1.5 py-1 text-left transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-popup-open:bg-muted sm:px-2"
                  render={<button type="button" />}
                >
                  <Avatar className="size-7 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {getInitials(user.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden min-w-0 flex-col leading-tight md:flex">
                    <span className="truncate text-xs font-semibold text-foreground">
                      {user.fullName}
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground">
                      {getRoleLabel(user.role)}
                    </span>
                  </span>
                  <IconChevronDown aria-hidden="true" className="hidden size-3.5 shrink-0 text-muted-foreground md:block" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="font-normal">
                    <span className="block text-sm font-semibold text-foreground">
                      {user.fullName}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {getRoleLabel(user.role)}
                      {user.unitId ? ` · Unit ${user.unitId}` : ""}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem render={<Link to="/" />}>
                    <IconHome data-icon="inline-start" />
                    Beranda
                  </DropdownMenuItem>
                  <DropdownMenuItem render={<Link to="/laporan" />}>
                    <IconLayoutList data-icon="inline-start" />
                    Laporan Insiden
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleLogout}
                  >
                    <IconLogout data-icon="inline-start" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button className="font-medium" render={<Link to="/login" />} size="sm">
                <IconLogin data-icon="inline-start" />
                <span className="hidden sm:inline">Masuk Staf</span>
                <span className="sm:hidden">Masuk</span>
              </Button>
            )}

            {/* Mobile hamburger */}
            <Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    aria-label="Buka navigasi"
                    className="-mr-1 lg:hidden"
                    size="icon-lg"
                    variant="ghost"
                  />
                }
              >
                <IconMenu2 className="size-5" />
              </SheetTrigger>
              <SheetContent className="w-72 gap-0 p-0 sm:max-w-72" side="right">
                <div className="flex items-center gap-2 px-4 py-3.5">
                  <span
                    aria-hidden="true"
                    className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground"
                  >
                    <IconHeartbeat className="size-4" />
                  </span>
                  <SheetTitle className="text-sm font-semibold">SIP-IKP IBS</SheetTitle>
                  <SheetDescription className="sr-only">Menu navigasi</SheetDescription>
                </div>
                <Separator />

                {user && (
                  <div className="flex items-center gap-3 bg-muted/40 px-4 py-3">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                        {getInitials(user.fullName)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {user.fullName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {getRoleLabel(user.role)}
                        {user.unitId ? ` · ${user.unitId}` : ""}
                      </p>
                    </div>
                  </div>
                )}

                <nav aria-label="Navigasi mobile" className="flex-1 overflow-y-auto px-3 py-3">
                  <ul className="flex flex-col gap-0.5">
                    {navItems.map((item) => (
                      <li key={item.to}>
                        <NavLink
                          className={({ isActive }) =>
                            cn(
                              "flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                              isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted hover:text-foreground",
                            )
                          }
                          end={item.to === "/"}
                          onClick={() => { setMobileOpen(false); }}
                          to={item.to}
                        >
                          <item.icon className="size-4 shrink-0" />
                          <span>{item.label}</span>
                        </NavLink>
                      </li>
                    ))}
                    {user && showReportAction && (
                      <li className="mt-2 px-1 lg:hidden">
                        <Button
                          className="w-full"
                          onClick={() => { setMobileOpen(false); }}
                          render={<Link to="/laporan/baru" />}
                        >
                          <IconPlus data-icon="inline-start" />
                          Lapor Insiden
                        </Button>
                      </li>
                    )}
                  </ul>
                </nav>

                <div className="border-t px-3 py-3">
                  {user ? (
                    <button
                      className="flex min-h-10 w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      onClick={handleLogout}
                      type="button"
                    >
                      <IconLogout className="size-4 shrink-0" />
                      <span>Keluar dari Sistem</span>
                    </button>
                  ) : (
                    <NavLink
                      className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary/10"
                      onClick={() => { setMobileOpen(false); }}
                      to="/login"
                    >
                      <IconLogin className="size-4 shrink-0" />
                      <span>Masuk Staf</span>
                    </NavLink>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* ─── Main content ─── */}
      <main className="flex-1" id="konten-utama">
        <Outlet />
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t bg-card no-print">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>
            Sistem Informasi Pelaporan Insiden Keselamatan Pasien — IBS RSUD Prof. Dr. W. Z.
            Johannes Kupang
          </p>
          <p className="flex items-center gap-1.5">
            <IconShieldCheck aria-hidden="true" className="size-3.5 shrink-0 text-primary" />
            <span>Kerahasiaan data pasien dilindungi kendali peran dan jejak audit.</span>
          </p>
        </div>
      </footer>
    </div>
  )
}
