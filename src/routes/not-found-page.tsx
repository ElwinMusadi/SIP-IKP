import { IconCompassOff } from "@tabler/icons-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6 lg:px-8">
      <span
        aria-hidden="true"
        className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground"
      >
        <IconCompassOff className="size-6" />
      </span>
      <p className="text-sm font-semibold text-primary">404 — Halaman tidak ditemukan</p>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Alamat yang Anda buka tidak tersedia
      </h1>
      <p className="max-w-md leading-6 text-muted-foreground">
        Periksa kembali alamat halaman, atau kembali ke beranda untuk melanjutkan pekerjaan Anda.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button render={<Link to="/" />}>Kembali ke Beranda</Button>
        <Button render={<Link to="/laporan" />} variant="outline">
          Buka Laporan Insiden
        </Button>
      </div>
    </div>
  )
}
