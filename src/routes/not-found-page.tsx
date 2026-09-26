import { Link } from "react-router"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[65vh] max-w-3xl flex-col items-start justify-center gap-5 px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-sm font-semibold text-primary">404</p>
      <h1 className="text-3xl font-semibold tracking-tight">Halaman tidak ditemukan</h1>
      <p className="max-w-xl leading-7 text-muted-foreground">
        Alamat yang dibuka tidak tersedia pada fondasi aplikasi ini.
      </p>
      <Button render={<Link to="/" />}>Kembali ke beranda</Button>
    </div>
  )
}
