import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChartBar,
  IconCircleCheck,
  IconClipboardList,
  IconClock,
  IconFilePlus,
  IconFileText,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react"
import { Link, useNavigate } from "react-router"

import { EmptyState } from "@/components/shared/empty-state"
import { ErrorState } from "@/components/shared/error-state"
import { StatTile } from "@/components/shared/stat-tile"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { fetchIncidents, fetchOperationalRecap } from "@/features/incidents/api/incidents-api"
import { IncidentStatusBadge } from "@/features/incidents/components/incident-status-badge"
import { RiskBadge } from "@/features/incidents/components/risk-badge"
import { INCIDENT_TYPE_SHORT_LABELS } from "@/features/incidents/lib/labels"
import type { IncidentReport, RecapSummary } from "@/features/incidents/types/incident"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

// ─── Helpers ─────────────────────────────────────────────────────

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

function formatTanggal(value: string): string {
  return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })
}

// ─── Task queue ("Perlu Tindakan Anda") ─────────────────────────

type TaskTone = "warning" | "primary" | "danger" | "success"

interface TaskItem {
  key: string
  tone: TaskTone
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  count?: number
  to: string
}

const toneStyles: Record<TaskTone, { icon: string; count: string }> = {
  warning: { icon: "bg-status-warning text-status-warning-foreground", count: "text-status-warning-foreground" },
  primary: { icon: "bg-primary/10 text-primary", count: "text-primary" },
  danger: { icon: "bg-risk-red text-risk-red-foreground", count: "text-risk-red-foreground" },
  success: { icon: "bg-status-success text-status-success-foreground", count: "text-status-success-foreground" },
}

function TaskQueue({ tasks }: { tasks: TaskItem[] }) {
  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 py-5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-status-success text-status-success-foreground">
            <IconCircleCheck className="size-4.5" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">Tidak ada tugas tertunda</p>
            <p className="text-xs text-muted-foreground">
              Semua laporan yang menjadi tanggung jawab Anda sudah diproses.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Perlu Tindakan Anda</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="flex flex-col">
          {tasks.map((task, index) => {
            const tone = toneStyles[task.tone]
            return (
              <li key={task.key}>
                <Link
                  className={cn(
                    "group -mx-2 flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-muted/60",
                    index > 0 && "border-t border-border/60",
                  )}
                  to={task.to}
                >
                  <span
                    aria-hidden="true"
                    className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", tone.icon)}
                  >
                    <task.icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {task.title}
                      {task.count !== undefined && task.count > 0 && (
                        <span className={cn("ml-1.5 font-semibold tabular-nums", tone.count)}>
                          ({task.count})
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {task.description}
                    </span>
                  </span>
                  <IconArrowRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  />
                </Link>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}

// ─── Recent incidents (responsive: table ≥md, cards <md) ─────────

function RecentIncidents({
  incidents,
  title,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: {
  incidents: IncidentReport[]
  title: string
  emptyTitle: string
  emptyDescription: string
  emptyAction?: React.ReactNode
}) {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Button
          className="text-muted-foreground"
          render={<Link to="/laporan" />}
          size="sm"
          variant="ghost"
        >
          Lihat semua
          <IconArrowRight data-icon="inline-end" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {incidents.length === 0 ? (
          <EmptyState
            className="border-0 bg-transparent py-6"
            description={emptyDescription}
            title={emptyTitle}
            action={emptyAction}
          />
        ) : (
          <>
            {/* Desktop / tablet */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-36">No. Laporan</TableHead>
                    <TableHead>Judul</TableHead>
                    <TableHead className="w-24">Tipe</TableHead>
                    <TableHead className="w-40">Status</TableHead>
                    <TableHead className="w-36">Risiko</TableHead>
                    <TableHead className="w-28 text-right">Tanggal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incidents.map((inc) => (
                    <TableRow key={inc.id}>
                      <TableCell className="font-mono text-xs font-medium">
                        <Link
                          className="rounded-sm hover:text-primary hover:underline hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          to={`/laporan/${inc.id}`}
                        >
                          {inc.report_number ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-56 truncate font-medium">
                        <Link
                          className="rounded-sm hover:text-primary hover:underline hover:underline-offset-2 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          to={`/laporan/${inc.id}`}
                        >
                          {inc.incident_title ?? "(Tanpa judul)"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {INCIDENT_TYPE_SHORT_LABELS[inc.incident_type]}
                      </TableCell>
                      <TableCell>
                        <IncidentStatusBadge status={inc.status} />
                      </TableCell>
                      <TableCell>
                        <RiskBadge grade={inc.risk_grade} />
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                        {formatTanggal(inc.incident_datetime)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <ul className="flex flex-col md:hidden">
              {incidents.map((inc, index) => (
                <li key={inc.id}>
                  <button
                    className={cn(
                      "flex w-full flex-col gap-1.5 py-3 text-left",
                      index > 0 && "border-t border-border/60",
                    )}
                    onClick={() => void navigate(`/laporan/${inc.id}`)}
                    type="button"
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {inc.incident_title ?? "(Tanpa judul)"}
                      </span>
                      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                        {inc.report_number ?? "DRAF"}
                      </span>
                    </span>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <IncidentStatusBadge status={inc.status} />
                      <RiskBadge grade={inc.risk_grade} />
                      <span className="text-[11px] text-muted-foreground tabular-nums">
                        {formatTanggal(inc.incident_datetime)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Dashboards per role ─────────────────────────────────────────

function NakesDashboard({ incidents }: { incidents: IncidentReport[] }) {
  const navigate = useNavigate()
  const drafts = incidents.filter((i) => i.status === "DRAFT")
  const submitted = incidents.filter((i) => i.status === "SUBMITTED")
  const revisions = incidents.filter((i) => i.status === "REVISION_REQUIRED")

  const tasks: TaskItem[] = [
    ...(revisions.length > 0
      ? [
          {
            key: "revisi",
            tone: "warning" as const,
            icon: IconAlertTriangle,
            title: "Laporan perlu diperbaiki",
            description: "Dikembalikan oleh Kepala Ruangan — perbaiki lalu kirim ulang.",
            count: revisions.length,
            to: "/laporan?status=REVISION_REQUIRED",
          },
        ]
      : []),
    ...(drafts.length > 0
      ? [
          {
            key: "draf",
            tone: "primary" as const,
            icon: IconFileText,
            title: "Draf belum terkirim",
            description: "Lanjutkan pengisian dan kirim laporan ketika siap.",
            count: drafts.length,
            to: "/laporan?status=DRAFT",
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <TaskQueue tasks={tasks} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hint="Siap dikirim"
          icon={IconFilePlus}
          label="Draf"
          onClick={() => void navigate("/laporan?status=DRAFT")}
          tone="default"
          value={drafts.length}
        />
        <StatTile
          hint="Menunggu verifikasi"
          icon={IconClock}
          label="Terkirim"
          onClick={() => void navigate("/laporan?status=SUBMITTED")}
          tone="primary"
          value={submitted.length}
        />
        <StatTile
          hint="Perlu revisi Anda"
          icon={IconAlertTriangle}
          label="Perlu Perbaikan"
          onClick={() => void navigate("/laporan?status=REVISION_REQUIRED")}
          tone={revisions.length > 0 ? "warning" : "default"}
          value={revisions.length}
        />
        <StatTile
          hint="Sepanjang waktu"
          icon={IconClipboardList}
          label="Total Laporan Saya"
          onClick={() => void navigate("/laporan")}
          value={incidents.length}
        />
      </div>

      <RecentIncidents
        emptyAction={
          <Button onClick={() => void navigate("/laporan/baru")} size="sm">
            <IconFilePlus data-icon="inline-start" />
            Buat Laporan Pertama
          </Button>
        }
        emptyDescription="Laporan insiden yang Anda buat akan tampil di sini."
        emptyTitle="Belum ada laporan"
        incidents={incidents.slice(0, 5)}
        title="Laporan Terbaru"
      />
    </div>
  )
}

function KepalaRuanganDashboard({ incidents }: { incidents: IncidentReport[] }) {
  const navigate = useNavigate()
  const needsReview = incidents.filter(
    (i) => i.status === "SUBMITTED" || i.status === "UNDER_REVIEW",
  )
  const investigations = incidents.filter((i) => i.status === "SIMPLE_INVESTIGATION")
  const highRisk = incidents.filter((i) => i.risk_grade === "KUNING" || i.risk_grade === "MERAH")

  const tasks: TaskItem[] = [
    ...(needsReview.length > 0
      ? [
          {
            key: "review",
            tone: "warning" as const,
            icon: IconFileText,
            title: "Menunggu verifikasi Anda",
            description: "Periksa laporan, tetapkan pita risiko, lalu lanjutkan alur.",
            count: needsReview.length,
            to: "/laporan?status=SUBMITTED",
          },
        ]
      : []),
    ...(investigations.length > 0
      ? [
          {
            key: "investigasi",
            tone: "primary" as const,
            icon: IconClipboardList,
            title: "Investigasi sederhana berjalan",
            description: "Lengkapi lembar kerja investigasi untuk risiko Biru/Hijau.",
            count: investigations.length,
            to: "/laporan?status=SIMPLE_INVESTIGATION",
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <TaskQueue tasks={tasks} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hint="Perlu diverifikasi"
          icon={IconClock}
          label="Menunggu Review"
          onClick={() => void navigate("/laporan?status=SUBMITTED")}
          tone={needsReview.length > 0 ? "warning" : "default"}
          value={needsReview.length}
        />
        <StatTile
          hint="Risiko Biru / Hijau"
          icon={IconClipboardList}
          label="Investigasi Sederhana"
          onClick={() => void navigate("/laporan?status=SIMPLE_INVESTIGATION")}
          tone="primary"
          value={investigations.length}
        />
        <StatTile
          hint="Pita Kuning / Merah"
          icon={IconAlertTriangle}
          label="Risiko Tinggi"
          onClick={() => void navigate("/laporan")}
          tone={highRisk.length > 0 ? "danger" : "default"}
          value={highRisk.length}
        />
        <StatTile
          hint="Unit saya, semua status"
          icon={IconChartBar}
          label="Total Laporan Unit"
          onClick={() => void navigate("/laporan/rekap")}
          value={incidents.length}
        />
      </div>

      <RecentIncidents
        emptyDescription="Laporan insiden unit Anda akan tampil di sini."
        emptyTitle="Belum ada laporan unit"
        incidents={incidents.slice(0, 7)}
        title="Aktivitas Terbaru Unit"
      />
    </div>
  )
}

function PmkpDashboard({
  incidents,
  summary,
}: {
  incidents: IncidentReport[]
  summary: RecapSummary | null
}) {
  const navigate = useNavigate()
  const pmkpQueue = incidents.filter((i) => i.status === "PMKP_REVIEW")
  const highRiskActive = incidents.filter(
    (i) =>
      (i.risk_grade === "KUNING" || i.risk_grade === "MERAH") &&
      i.status !== "COMPLETED" &&
      i.status !== "COMPLETED_BY_UNIT",
  )

  const tasks: TaskItem[] = [
    ...(pmkpQueue.length > 0
      ? [
          {
            key: "pmkp",
            tone: "warning" as const,
            icon: IconShieldCheck,
            title: "Antrean tinjauan PMKP",
            description: "Kasus risiko tinggi menunggu arahan dan evaluasi komite.",
            count: pmkpQueue.length,
            to: "/laporan?status=PMKP_REVIEW",
          },
        ]
      : []),
    ...(highRiskActive.length > 0
      ? [
          {
            key: "risiko-tinggi",
            tone: "danger" as const,
            icon: IconAlertTriangle,
            title: "Kasus risiko tinggi masih terbuka",
            description: "Pantau tindak lanjut pita Kuning dan Merah.",
            count: highRiskActive.length,
            to: "/laporan",
          },
        ]
      : []),
  ]

  return (
    <div className="flex flex-col gap-6">
      <TaskQueue tasks={tasks} />

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            hint="Semua status"
            icon={IconClipboardList}
            label="Total Laporan"
            onClick={() => void navigate("/laporan")}
            value={summary.totalReports}
          />
          <StatTile
            hint="Menunggu arahan komite"
            icon={IconShieldCheck}
            label="Tinjauan PMKP"
            onClick={() => void navigate("/laporan?status=PMKP_REVIEW")}
            tone={pmkpQueue.length > 0 ? "warning" : "default"}
            value={pmkpQueue.length}
          />
          <StatTile
            hint="Pita Kuning"
            icon={IconAlertTriangle}
            label="Risiko Tinggi"
            onClick={() => void navigate("/laporan/rekap")}
            tone={summary.byRiskGrade.KUNING > 0 ? "warning" : "default"}
            value={summary.byRiskGrade.KUNING}
          />
          <StatTile
            hint="Pita Merah"
            icon={IconAlertTriangle}
            label="Risiko Ekstrem"
            onClick={() => void navigate("/laporan/rekap")}
            tone={summary.byRiskGrade.MERAH > 0 ? "danger" : "default"}
            value={summary.byRiskGrade.MERAH}
          />
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          to="/laporan"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <IconClipboardList className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Daftar Laporan Insiden</span>
            <span className="block text-xs text-muted-foreground">
              Pantau semua laporan lintas status dan pita risiko.
            </span>
          </span>
        </Link>
        <Link
          className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          to="/laporan/rekap"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <IconChartBar className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Rekapitulasi Operasional</span>
            <span className="block text-xs text-muted-foreground">
              Indikator mutu dan keselamatan pasien IBS.
            </span>
          </span>
        </Link>
      </div>

      <RecentIncidents
        emptyDescription="Tidak ada kasus risiko Kuning/Merah yang terbuka saat ini."
        emptyTitle="Tidak ada kasus risiko tinggi"
        incidents={highRiskActive.slice(0, 7)}
        title="Kasus Risiko Tinggi Terbuka"
      />
    </div>
  )
}

function AdminDashboard({ incidents }: { incidents: IncidentReport[] }) {
  const navigate = useNavigate()
  const drafts = incidents.filter((i) => i.status === "DRAFT")
  const inProgress = incidents.filter(
    (i) =>
      i.status === "SUBMITTED" ||
      i.status === "UNDER_REVIEW" ||
      i.status === "SIMPLE_INVESTIGATION" ||
      i.status === "PMKP_REVIEW",
  )
  const completed = incidents.filter(
    (i) => i.status === "COMPLETED" || i.status === "COMPLETED_BY_UNIT",
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          hint="Semua status"
          icon={IconClipboardList}
          label="Total Laporan"
          onClick={() => void navigate("/laporan")}
          value={incidents.length}
        />
        <StatTile
          hint="Review & investigasi"
          icon={IconClock}
          label="Dalam Proses"
          onClick={() => void navigate("/laporan")}
          tone="primary"
          value={inProgress.length}
        />
        <StatTile
          hint="Belum dikirim pelapor"
          icon={IconFileText}
          label="Draf Aktif"
          onClick={() => void navigate("/laporan?status=DRAFT")}
          value={drafts.length}
        />
        <StatTile
          hint="Kasus ditutup"
          icon={IconCircleCheck}
          label="Selesai"
          onClick={() => void navigate("/laporan?status=COMPLETED")}
          tone="success"
          value={completed.length}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          to="/admin/users"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <IconUsers className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Manajemen Pengguna</span>
            <span className="block text-xs text-muted-foreground">
              Kelola akun dan hak akses staf IBS.
            </span>
          </span>
        </Link>
        <Link
          className="group flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
          to="/laporan/rekap"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
            <IconChartBar className="size-4.5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-medium text-foreground">Rekapitulasi Operasional</span>
            <span className="block text-xs text-muted-foreground">
              Rekap laporan dan indikator keselamatan pasien.
            </span>
          </span>
        </Link>
      </div>

      <RecentIncidents
        emptyDescription="Laporan insiden dari seluruh unit akan tampil di sini."
        emptyTitle="Belum ada laporan"
        incidents={incidents.slice(0, 7)}
        title="Laporan Terbaru"
      />
    </div>
  )
}

// ─── Public landing (not logged in) ─────────────────────────────

function PublicLanding() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 py-6 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <IconShieldCheck className="size-7" />
      </span>
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-semibold tracking-tight text-foreground text-balance sm:text-2xl">
        Pelaporan insiden yang tertib, terlacak, dan rahasia
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Masuk dengan akun staf IBS untuk membuat laporan insiden, menindaklanjuti verifikasi,
          dan memantau rekapitulasi keselamatan pasien.
        </p>
      </div>
      <Button render={<Link to="/login" />} size="lg">
        Masuk ke Sistem
        <IconArrowRight data-icon="inline-end" />
      </Button>
    </div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div aria-busy="true" aria-label="Memuat dashboard" className="flex flex-col gap-6">
      <Skeleton className="h-24 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton className="h-24 w-full rounded-xl" key={index} />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-xl" />
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────

export function HomePage() {
  const { user, isLoading: authLoading } = useAuth()

  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [summary, setSummary] = useState<RecapSummary | null>(null)
  const [dataLoading, setDataLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (authLoading || !user) {
      return
    }

    let isMounted = true

    async function loadDashboard() {
      if (isMounted) {
        setDataLoading(true)
        setLoadError(false)
      }
      const [incData, recapData] = await Promise.allSettled([
        fetchIncidents(),
        fetchOperationalRecap(),
      ])

      if (!isMounted) return

      if (incData.status === "fulfilled") setIncidents(incData.value)
      if (recapData.status === "fulfilled") setSummary(recapData.value.summary)
      if (incData.status === "rejected") setLoadError(true)
      setDataLoading(false)
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [user, authLoading, reloadKey])

  const isLoading = authLoading || dataLoading

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      {/* Page header */}
      <header className="flex flex-col gap-3 border-b pb-5 md:flex-row md:items-end md:justify-between">
        {user ? (
          <>
            <div className="flex flex-col gap-1">
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <IconClock aria-hidden="true" className="size-3.5" />
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Selamat datang, {user.fullName.split(",")[0]}
              </h1>
              <p className="text-sm text-muted-foreground">
                {getRoleLabel(user.role)} · Instalasi Bedah Sentral (IBS)
              </p>
            </div>
            {user.role !== "ADMINISTRATOR" && (
              <Button className="mt-1 md:mt-0" render={<Link to="/laporan/baru" />}>
                <IconFilePlus data-icon="inline-start" />
                Lapor Insiden
              </Button>
            )}
          </>
        ) : (
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              SIP-IKP — Sistem Pelaporan Insiden Keselamatan Pasien
            </h1>
            <p className="text-sm text-muted-foreground">
              Instalasi Bedah Sentral — RSUD Prof. Dr. W. Z. Johannes Kupang
            </p>
          </div>
        )}
      </header>

      {/* Dashboard content */}
      {!user ? (
        <PublicLanding />
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : loadError ? (
        <ErrorState
          message="Data dashboard tidak dapat dimuat. Periksa koneksi Anda lalu muat ulang."
          onRetry={() => { setReloadKey((key) => key + 1); }}
        />
      ) : user.role === "TENAGA_KESEHATAN" ? (
        <NakesDashboard incidents={incidents} />
      ) : user.role === "KEPALA_RUANGAN" ? (
        <KepalaRuanganDashboard incidents={incidents} />
      ) : user.role === "KOMITE_PMKP" ? (
        <PmkpDashboard incidents={incidents} summary={summary} />
      ) : (
        <AdminDashboard incidents={incidents} />
      )}
    </div>
  )
}
