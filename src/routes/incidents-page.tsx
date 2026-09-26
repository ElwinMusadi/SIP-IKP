import {
  IconAlertTriangle,
  IconFilePlus,
  IconFolderCheck,
  IconShieldLock,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"

export function IncidentsPage() {
  const { user } = useAuth()

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-2 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-xs font-semibold tracking-wider text-primary uppercase">
            Instalasi Bedah Sentral &bull; {user.unitId}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Pelaporan Insiden Keselamatan Pasien
          </h1>
          <p className="text-sm text-muted-foreground">
            Fondasi autentikasi &amp; RBAC aktif untuk peran:{" "}
            <strong className="text-foreground">{user.role}</strong> ({user.profession}).
          </p>
        </div>

        {user.role !== "ADMINISTRATOR" && (
          <Button className="shrink-0 gap-2 font-medium" disabled variant="default">
            <IconFilePlus className="size-4" />
            <span>Buat Laporan Baru (Phase 08)</span>
          </Button>
        )}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconFolderCheck className="size-5" />
          </div>
          <h2 className="text-base font-semibold">Visibilitas Peer Nakes IBS</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Sesuai keputusan rekonsiliasi workshop, Nakes IBS dapat membaca laporan insiden terkirim
            milik rekan sejawat IBS untuk pembelajaran mutu non-punitif.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconAlertTriangle className="size-5" />
          </div>
          <h2 className="text-base font-semibold">Privasi Draf Pribadi</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Draf laporan bersifat 100% privat untuk pembuat draf (<code>created_by</code>) hingga
            dikirimkan secara resmi.
          </p>
        </article>

        <article className="flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-xs">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconShieldLock className="size-5" />
          </div>
          <h2 className="text-base font-semibold">Batas Kerahasiaan Admin</h2>
          <p className="text-xs leading-5 text-muted-foreground">
            Administrator sistem dibatasi pada pengelolaan pengguna dan master data; akses narasi
            klinis dan rekam medis pasien ditutup secara default.
          </p>
        </article>
      </section>

      <div className="rounded-xl border border-dashed bg-muted/20 p-8 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Daftar Laporan &amp; Wizard Formulir Form IKP</p>
        <p className="mt-1 text-xs">
          CRUD formulir insiden lengkap (Bagian I, II, dan III Form IKP) akan diimplementasikan pada
          Phase berikutnya setelah fondasi domain D1 aktif.
        </p>
      </div>
    </div>
  )
}
