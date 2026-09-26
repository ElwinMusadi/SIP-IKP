import { IconCloud, IconCode, IconDatabase, IconShieldCheck } from "@tabler/icons-react"
import { Link } from "react-router"

import { Button } from "@/components/ui/button"

const foundations = [
  {
    title: "Frontend terverifikasi",
    description: "React 19, TypeScript strict, Vite, Tailwind CSS v4, dan shadcn/ui.",
    icon: IconCode,
  },
  {
    title: "Cloudflare siap dikembangkan",
    description: "Pages Functions tersedia dengan strategi binding D1 dan R2 tanpa data produksi.",
    icon: IconCloud,
  },
  {
    title: "Data belum dibuat",
    description:
      "Schema, migration, autentikasi, dan workflow klinis sengaja berada di luar fase ini.",
    icon: IconDatabase,
  },
]

export function HomePage() {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-12 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <section
        aria-labelledby="home-title"
        className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(18rem,0.5fr)] lg:items-end"
      >
        <div className="flex flex-col gap-5">
          <p className="text-sm font-semibold tracking-[0.12em] text-primary uppercase">
            Instalasi Bedah Sentral
          </p>
          <h1
            className="max-w-4xl text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl"
            id="home-title"
          >
            Fondasi sistem pelaporan keselamatan pasien yang tenang, terukur, dan dapat diaudit.
          </h1>
          <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
            Shell ini membuktikan stack aplikasi berjalan. Belum ada autentikasi, data pasien,
            laporan insiden, atau proses PMKP pada fase inisialisasi.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link to="/fondasi" />} size="lg">
              Lihat status fondasi
            </Button>
            <Button render={<a href="/api/health" />} size="lg" variant="outline">
              Periksa API health
            </Button>
          </div>
        </div>

        <aside className="rounded-xl border bg-card p-5 shadow-sm" aria-label="Batas fase">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconShieldCheck aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-1">
              <p className="font-semibold">Tidak memuat data klinis</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Konten saat ini hanya metadata proyek dan status toolchain. Tidak ada contoh pasien
                atau insiden.
              </p>
            </div>
          </div>
        </aside>
      </section>

      <section aria-labelledby="foundation-title" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">Phase 01</p>
          <h2 className="text-2xl font-semibold tracking-tight" id="foundation-title">
            Area fondasi
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {foundations.map(({ title, description, icon: Icon }) => (
            <article className="flex flex-col gap-4 rounded-xl border bg-card p-5" key={title}>
              <span className="flex size-10 items-center justify-center rounded-lg bg-muted text-primary">
                <Icon aria-hidden="true" />
              </span>
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="risk-token-title"
        className="flex flex-col gap-4 rounded-xl border bg-card p-5"
      >
        <div>
          <h2 className="text-lg font-semibold" id="risk-token-title">
            Token risiko dasar
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Warna selalu disertai label teks agar makna tidak bergantung pada warna.
          </p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-lg bg-risk-blue px-4 py-3 font-medium text-risk-blue-foreground">
            BIRU — label tekstual
          </li>
          <li className="rounded-lg bg-risk-green px-4 py-3 font-medium text-risk-green-foreground">
            HIJAU — label tekstual
          </li>
          <li className="rounded-lg bg-risk-yellow px-4 py-3 font-medium text-risk-yellow-foreground">
            KUNING — label tekstual
          </li>
          <li className="rounded-lg bg-risk-red px-4 py-3 font-medium text-risk-red-foreground">
            MERAH — label tekstual
          </li>
        </ul>
      </section>
    </div>
  )
}
