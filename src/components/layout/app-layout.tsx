import { IconHeartbeat, IconMenu2, IconShieldCheck } from "@tabler/icons-react"
import { NavLink, Outlet } from "react-router"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const navigation = [
  { label: "Beranda", to: "/" },
  { label: "Status fondasi", to: "/fondasi" },
]

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <a
        className="sr-only fixed top-3 left-3 z-50 rounded-md bg-primary px-4 py-2 text-primary-foreground focus:not-sr-only"
        href="#konten-utama"
      >
        Lewati ke konten utama
      </a>

      <header className="border-b bg-card">
        <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <NavLink className="flex min-w-0 items-center gap-3" to="/">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
            >
              <IconHeartbeat />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight">
                SIP-IKP IBS
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                RSUD Prof. Dr. W. Z. Johannes Kupang
              </span>
            </span>
          </NavLink>

          <nav aria-label="Navigasi utama" className="hidden items-center gap-1 sm:flex">
            {navigation.map((item) => (
              <NavLink
                className={({ isActive }) =>
                  cn(
                    "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                    isActive && "bg-muted text-foreground",
                  )
                }
                key={item.to}
                to={item.to}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <Button aria-label="Buka navigasi" className="sm:hidden" size="icon" variant="outline">
            <IconMenu2 />
          </Button>
        </div>
      </header>

      <main id="konten-utama">
        <Outlet />
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>Fondasi pengembangan — belum memuat data atau alur klinis.</p>
          <p className="flex items-center gap-2">
            <IconShieldCheck aria-hidden="true" className="size-4" />
            Keamanan dan akses akan diterapkan pada fase khusus.
          </p>
        </div>
      </footer>
    </div>
  )
}
