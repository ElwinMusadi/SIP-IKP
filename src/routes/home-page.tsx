import { useEffect, useState } from "react"
import {
  IconAlertTriangle,
  IconChartBar,
  IconCheck,
  IconClipboardList,
  IconClock,
  IconFilePlus,
  IconFileText,
  IconFolder,
  IconShieldCheck,
  IconUsers,
} from "@tabler/icons-react"
import { Link, useNavigate } from "react-router"

import { Button } from "@/components/ui/button"
import { fetchIncidents, fetchOperationalRecap } from "@/features/incidents/api/incidents-api"
import { IncidentStatusBadge } from "@/features/incidents/components/incident-status-badge"
import { RiskBadge } from "@/features/incidents/components/risk-badge"
import type { IncidentReport, RecapSummary } from "@/features/incidents/types/incident"
import type { UserRole } from "@/lib/auth-context"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"

// ─── Role-aware welcome label ─────────────────────────────────────
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

// ─── Metric tile ─────────────────────────────────────────────────
function MetricTile({
  label,
  value,
  sublabel,
  accent,
}: {
  label: string
  value: number | string
  sublabel?: string
  accent?: "default" | "warning" | "danger" | "success"
}) {
  const valueClass = cn(
    "mt-1 text-2xl font-bold tabular-nums",
    accent === "warning" && "text-amber-700",
    accent === "danger" && "text-rose-700",
    accent === "success" && "text-emerald-700",
    (!accent || accent === "default") && "text-foreground",
  )
  return (
    <div className="flex flex-col gap-0.5 rounded-lg border bg-card px-4 py-3.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className={valueClass}>{value}</span>
      {sublabel && <span className="text-[11px] text-muted-foreground">{sublabel}</span>}
    </div>
  )
}

// ─── Action card ─────────────────────────────────────────────────
function ActionCard({
  title,
  description,
  to,
  icon: Icon,
  variant = "default",
}: {
  title: string
  description: string
  to: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "primary"
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:border-primary/40 hover:bg-primary/5",
        variant === "primary" && "border-primary/30 bg-primary/5",
      )}
    >
      <span
        className={cn(
          "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md",
          variant === "primary"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Icon className="size-4" />
      </span>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-xs text-muted-foreground leading-relaxed">{description}</span>
      </div>
    </Link>
  )
}

// ─── Incident row (compact) ──────────────────────────────────────
function IncidentRow({ inc }: { inc: IncidentReport }) {
  const navigate = useNavigate()
  return (
    <tr
      className="cursor-pointer transition-colors hover:bg-muted/30"
      onClick={() => void navigate(`/laporan/${inc.id}`)}
    >
      <td className="py-2.5 pl-4 pr-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-[11px] font-semibold text-foreground">
            {inc.report_number ?? "DRAF"}
          </span>
          <IncidentStatusBadge status={inc.status} />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className="line-clamp-2 text-xs font-medium text-foreground">
          {inc.incident_title ?? "(Draf tanpa judul)"}
        </span>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap">
        <RiskBadge grade={inc.risk_grade} />
      </td>
      <td className="py-2.5 pl-3 pr-4 whitespace-nowrap text-right">
        <span className="text-[11px] text-muted-foreground">
          {new Date(inc.incident_datetime).toLocaleDateString("id-ID")}
        </span>
      </td>
    </tr>
  )
}

// ─── Dashboard sections per role ─────────────────────────────────

function NakesDashboard({
  incidents,
  isLoading,
}: {
  incidents: IncidentReport[]
  isLoading: boolean
}) {
  const navigate = useNavigate()
  const myDrafts = incidents.filter((i) => i.status === "DRAFT")
  const mySubmitted = incidents.filter((i) => i.status === "SUBMITTED")
  const revisionRequired = incidents.filter((i) => i.status === "REVISION_REQUIRED")

  return (
    <div className="flex flex-col gap-6">
      {/* Quick actions */}
      <section aria-labelledby="quick-actions-title">
        <h2 className="mb-3 text-sm font-semibold text-foreground" id="quick-actions-title">
          Tindakan Cepat
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            description="Mulai laporan insiden keselamatan pasien baru."
            icon={IconFilePlus}
            title="Buat Laporan Insiden"
            to="/laporan/baru"
            variant="primary"
          />
          <ActionCard
            description="Lihat semua laporan insiden yang telah dibuat."
            icon={IconClipboardList}
            title="Daftar Laporan Saya"
            to="/laporan"
          />
        </div>
      </section>

      {/* Attention items */}
      {revisionRequired.length > 0 && (
        <section
          aria-labelledby="revision-title"
          className="rounded-lg border border-amber-300/50 bg-amber-50/40 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <IconAlertTriangle className="size-4 text-amber-600" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-amber-800" id="revision-title">
              Perlu Perbaikan ({revisionRequired.length})
            </h2>
          </div>
          <p className="mb-3 text-xs text-amber-700">
            Laporan berikut dikembalikan oleh Kepala Ruangan dan memerlukan revisi.
          </p>
          <div className="flex flex-col gap-1.5">
            {revisionRequired.slice(0, 3).map((inc) => (
              <button
                key={inc.id}
                className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-3 py-2 text-left text-xs hover:border-amber-400 transition-colors"
                onClick={() => void navigate(`/laporan/${inc.id}`)}
                type="button"
              >
                <span className="font-medium text-foreground">
                  {inc.incident_title ?? "(Draf tanpa judul)"}
                </span>
                <span className="ml-2 font-mono text-[11px] text-muted-foreground">
                  {inc.report_number ?? "DRAF"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Metrics */}
      <section aria-labelledby="my-metrics-title">
        <h2 className="mb-3 text-sm font-semibold text-foreground" id="my-metrics-title">
          Ringkasan Laporan Saya
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <MetricTile label="Draf Tersimpan" value={myDrafts.length} sublabel="Belum dikirim" />
          <MetricTile
            label="Menunggu Verifikasi"
            value={mySubmitted.length}
            sublabel="Dalam antrean review"
          />
          <MetricTile
            label="Perlu Revisi"
            value={revisionRequired.length}
            sublabel="Dikembalikan Kepala Ruangan"
            accent={revisionRequired.length > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      {/* Recent incidents */}
      {!isLoading && incidents.length > 0 && (
        <section aria-labelledby="recent-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground" id="recent-title">
              Laporan Terbaru
            </h2>
            <Link to="/laporan" className="text-xs text-primary hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="py-2 pl-4 pr-3 font-medium text-muted-foreground">No./Status</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Judul</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Risiko</th>
                  <th className="py-2 pl-3 pr-4 text-right font-medium text-muted-foreground">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.slice(0, 5).map((inc) => (
                  <IncidentRow inc={inc} key={inc.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!isLoading && incidents.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-10 text-center">
          <IconFolder className="size-8 text-muted-foreground/40" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Belum ada laporan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Mulai buat laporan insiden pertama Anda.
            </p>
          </div>
          <Button
            className="mt-1 gap-1.5"
            onClick={() => void navigate("/laporan/baru")}
            size="sm"
          >
            <IconFilePlus className="size-4" />
            Buat Laporan
          </Button>
        </div>
      )}
    </div>
  )
}

function KepalaRuanganDashboard({
  incidents,
  isLoading,
}: {
  incidents: IncidentReport[]
  isLoading: boolean
}) {
  const navigate = useNavigate()
  const needsReview = incidents.filter(
    (i) => i.status === "SUBMITTED" || i.status === "UNDER_REVIEW",
  )
  const revisionRequired = incidents.filter((i) => i.status === "REVISION_REQUIRED")
  const simpleInvestigation = incidents.filter((i) => i.status === "SIMPLE_INVESTIGATION")
  const highRisk = incidents.filter(
    (i) => i.risk_grade === "KUNING" || i.risk_grade === "MERAH",
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Action items */}
      {needsReview.length > 0 && (
        <section
          aria-labelledby="review-needed-title"
          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <IconFileText className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground" id="review-needed-title">
              Menunggu Review Anda ({needsReview.length})
            </h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Laporan berikut perlu diverifikasi dan ditetapkan pita risikonya.
          </p>
          <div className="flex flex-col gap-1.5">
            {needsReview.slice(0, 5).map((inc) => (
              <button
                key={inc.id}
                className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-left text-xs hover:bg-muted/50 transition-colors"
                onClick={() => void navigate(`/laporan/${inc.id}`)}
                type="button"
              >
                <span className="font-medium text-foreground">
                  {inc.incident_title ?? "(Draf tanpa judul)"}
                </span>
                <span className="ml-2 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {inc.report_number ?? "DRAF"}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Metrics */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile
          label="Menunggu Review"
          value={needsReview.length}
          accent={needsReview.length > 0 ? "warning" : "default"}
        />
        <MetricTile
          label="Investigasi Sederhana"
          value={simpleInvestigation.length}
          sublabel="BIRU / HIJAU"
        />
        <MetricTile
          label="Perlu Revisi"
          value={revisionRequired.length}
          sublabel="Dikembalikan ke pelapor"
        />
        <MetricTile
          label="Risiko Tinggi"
          value={highRisk.length}
          sublabel="KUNING / MERAH"
          accent={highRisk.length > 0 ? "danger" : "default"}
        />
      </div>

      {/* Quick nav */}
      <section aria-labelledby="nav-title">
        <h2 className="mb-3 text-sm font-semibold text-foreground" id="nav-title">
          Navigasi Cepat
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <ActionCard
            description="Lihat semua laporan dan pantau alur kerja pelaporan."
            icon={IconClipboardList}
            title="Daftar Laporan Insiden"
            to="/laporan"
          />
          <ActionCard
            description="Ringkasan agregat dan indikator keselamatan pasien."
            icon={IconChartBar}
            title="Rekapitulasi Operasional"
            to="/laporan/rekap"
          />
        </div>
      </section>

      {/* All recent */}
      {!isLoading && incidents.length > 0 && (
        <section aria-labelledby="all-recent-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground" id="all-recent-title">
              Laporan Terbaru
            </h2>
            <Link to="/laporan" className="text-xs text-primary hover:underline">
              Lihat semua →
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="py-2 pl-4 pr-3 font-medium text-muted-foreground">No./Status</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Judul</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Risiko</th>
                  <th className="py-2 pl-3 pr-4 text-right font-medium text-muted-foreground">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {incidents.slice(0, 7).map((inc) => (
                  <IncidentRow inc={inc} key={inc.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function PmkpDashboard({
  incidents,
  summary,
  isLoading,
}: {
  incidents: IncidentReport[]
  summary: RecapSummary | null
  isLoading: boolean
}) {
  const pmkpReview = incidents.filter((i) => i.status === "PMKP_REVIEW")
  const highRisk = incidents.filter(
    (i) => i.risk_grade === "KUNING" || i.risk_grade === "MERAH",
  )

  return (
    <div className="flex flex-col gap-6">
      {/* Action items */}
      {pmkpReview.length > 0 && (
        <section
          aria-labelledby="pmkp-pending-title"
          className="rounded-lg border border-primary/30 bg-primary/5 p-4"
        >
          <div className="mb-2 flex items-center gap-2">
            <IconShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-foreground" id="pmkp-pending-title">
              Tinjauan PMKP Menunggu ({pmkpReview.length})
            </h2>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Kasus risiko KUNING/MERAH berikut memerlukan tindakan PMKP.
          </p>
          <Link
            to="/laporan?status=PMKP_REVIEW"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <IconFileText className="size-3.5" />
            Buka Antrian Tinjauan PMKP
          </Link>
        </section>
      )}

      {/* Metrics */}
      {summary && (
        <section aria-labelledby="pmkp-metrics-title">
          <h2 className="mb-3 text-sm font-semibold text-foreground" id="pmkp-metrics-title">
            Ringkasan Operasional
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricTile label="Total Laporan" value={summary.totalReports} sublabel="Semua status" />
            <MetricTile
              label="Risiko Tinggi (KUNING)"
              value={summary.byRiskGrade.KUNING}
              accent={summary.byRiskGrade.KUNING > 0 ? "warning" : "default"}
            />
            <MetricTile
              label="Risiko Ekstrem (MERAH)"
              value={summary.byRiskGrade.MERAH}
              accent={summary.byRiskGrade.MERAH > 0 ? "danger" : "default"}
            />
            <MetricTile
              label="Kepatuhan SLA"
              value={
                summary.totalReports > 0
                  ? `${String(Math.round((summary.bySla.onTime / summary.totalReports) * 100))}%`
                  : "—"
              }
              sublabel="Pelaporan 48 jam"
              accent={
                summary.totalReports > 0 &&
                summary.bySla.onTime / summary.totalReports < 0.7
                  ? "warning"
                  : "default"
              }
            />
          </div>
        </section>
      )}

      {/* Navigation */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          description="Pantau semua laporan insiden lintas status dan pita risiko."
          icon={IconClipboardList}
          title="Daftar Laporan Insiden"
          to="/laporan"
        />
        <ActionCard
          description="Rekapitulasi dan indikator mutu keselamatan pasien IBS."
          icon={IconChartBar}
          title="Rekapitulasi Operasional"
          to="/laporan/rekap"
          variant="primary"
        />
      </div>

      {/* High-risk incidents */}
      {!isLoading && highRisk.length > 0 && (
        <section aria-labelledby="high-risk-title">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground" id="high-risk-title">
              Laporan Risiko Tinggi / Ekstrem
            </h2>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30">
                <tr>
                  <th className="py-2 pl-4 pr-3 font-medium text-muted-foreground">No./Status</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Judul</th>
                  <th className="px-3 py-2 font-medium text-muted-foreground">Risiko</th>
                  <th className="py-2 pl-3 pr-4 text-right font-medium text-muted-foreground">
                    Tanggal
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {highRisk.slice(0, 7).map((inc) => (
                  <IncidentRow inc={inc} key={inc.id} />
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}

function AdminDashboard({ incidents }: { incidents: IncidentReport[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricTile label="Total Laporan" value={incidents.length} sublabel="Semua status" />
        <MetricTile
          label="Draf Aktif"
          value={incidents.filter((i) => i.status === "DRAFT").length}
          sublabel="Belum dikirim"
        />
        <MetricTile
          label="Dalam Proses"
          value={
            incidents.filter(
              (i) =>
                i.status === "SUBMITTED" ||
                i.status === "UNDER_REVIEW" ||
                i.status === "SIMPLE_INVESTIGATION" ||
                i.status === "PMKP_REVIEW",
            ).length
          }
          sublabel="Review & investigasi"
        />
        <MetricTile
          label="Selesai"
          value={
            incidents.filter(
              (i) => i.status === "COMPLETED" || i.status === "COMPLETED_BY_UNIT",
            ).length
          }
          sublabel="Kasus ditutup"
          accent="success"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ActionCard
          description="Pantau semua laporan insiden operasional IBS."
          icon={IconClipboardList}
          title="Daftar Laporan Insiden"
          to="/laporan"
        />
        <ActionCard
          description="Rekapitulasi dan indikator mutu keselamatan pasien."
          icon={IconChartBar}
          title="Rekapitulasi Operasional"
          to="/laporan/rekap"
        />
        <ActionCard
          description="Kelola akun pengguna dan hak akses staf IBS."
          icon={IconUsers}
          title="Manajemen Pengguna"
          to="/admin/users"
          variant="primary"
        />
      </div>
    </div>
  )
}

// ─── Public landing (not logged in) ─────────────────────────────
function PublicLanding() {
  return (
    <div className="flex flex-col items-center gap-6 py-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10">
        <IconShieldCheck className="size-8 text-primary" aria-hidden="true" />
      </div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sistem Informasi Pelaporan Insiden Keselamatan Pasien
        </h1>
        <p className="max-w-lg text-sm text-muted-foreground leading-relaxed">
          Instalasi Bedah Sentral — RSUD Prof. Dr. W. Z. Johannes Kupang
        </p>
      </div>
      <div className="flex flex-col gap-2 text-xs text-muted-foreground max-w-sm">
        <p>Silakan masuk menggunakan akun staf IBS untuk mengakses sistem pelaporan.</p>
      </div>
      <Link
        to="/login"
        className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        <IconCheck className="size-4" />
        Masuk ke Sistem
      </Link>
    </div>
  )
}

// ─── Loading skeleton ────────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Memuat dashboard...">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────
export function HomePage() {
  const { user, isLoading: authLoading } = useAuth()

  const [incidents, setIncidents] = useState<IncidentReport[]>([])
  const [summary, setSummary] = useState<RecapSummary | null>(null)
  const [dataLoading, setDataLoading] = useState(false)

  useEffect(() => {
    if (authLoading || !user) {
      return
    }

    let isMounted = true

    async function loadDashboard() {
      if (isMounted) setDataLoading(true)
      try {
        const [incData, recapData] = await Promise.allSettled([
          fetchIncidents(),
          fetchOperationalRecap(),
        ])

        if (!isMounted) return

        if (incData.status === "fulfilled") setIncidents(incData.value)
        if (recapData.status === "fulfilled") setSummary(recapData.value.summary)
      } catch {
        // silently fail; show empty states
      } finally {
        if (isMounted) setDataLoading(false)
      }
    }

    void loadDashboard()

    return () => {
      isMounted = false
    }
  }, [user, authLoading])

  const isLoading = authLoading || dataLoading

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      {/* Page header */}
      <header className="border-b pb-5">
        {user ? (
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <IconClock className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("id-ID", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Selamat datang, {user.fullName.split(",")[0]}
            </h1>
            <p className="text-sm text-muted-foreground">
              {getRoleLabel(user.role)} · Instalasi Bedah Sentral (IBS)
            </p>
          </div>
        ) : (
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              SIP-IKP — Sistem Pelaporan Insiden Keselamatan Pasien IBS
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              RSUD Prof. Dr. W. Z. Johannes Kupang
            </p>
          </div>
        )}
      </header>

      {/* Dashboard content */}
      {!user ? (
        <PublicLanding />
      ) : isLoading ? (
        <DashboardSkeleton />
      ) : user.role === "TENAGA_KESEHATAN" ? (
        <NakesDashboard incidents={incidents} isLoading={dataLoading} />
      ) : user.role === "KEPALA_RUANGAN" ? (
        <KepalaRuanganDashboard incidents={incidents} isLoading={dataLoading} />
      ) : user.role === "KOMITE_PMKP" ? (
        <PmkpDashboard incidents={incidents} summary={summary} isLoading={dataLoading} />
      ) : (
        <AdminDashboard incidents={incidents} />
      )}
    </div>
  )
}
