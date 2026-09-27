import { useEffect, useState } from "react"
import {
  IconAlertCircle,
  IconCheck,
  IconEdit,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconUserOff,
  IconUsers,
  IconX,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/use-auth"
import { cn } from "@/lib/utils"
import {
  createUser,
  listUsers,
  toggleUserActivation,
  updateUser,
  type AdminUser,
  type UserRole,
} from "../api/admin-api"

const ROLES: { value: UserRole; label: string }[] = [
  { value: "TENAGA_KESEHATAN", label: "Tenaga Kesehatan" },
  { value: "KEPALA_RUANGAN", label: "Kepala Ruangan" },
  { value: "KOMITE_PMKP", label: "Komite PMKP" },
  { value: "ADMINISTRATOR", label: "Administrator" },
]

function roleLabel(role: UserRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role
}

function RoleBadge({ role }: { role: UserRole }) {
  const colorMap: Record<UserRole, string> = {
    TENAGA_KESEHATAN:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300",
    KEPALA_RUANGAN:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300",
    KOMITE_PMKP:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950 dark:text-violet-300",
    ADMINISTRATOR:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
        colorMap[role],
      )}
    >
      {roleLabel(role)}
    </span>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <IconCheck className="size-3" aria-hidden="true" />
        Aktif
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300">
      <IconUserOff className="size-3" aria-hidden="true" />
      Nonaktif
    </span>
  )
}

// ─── Create / Edit dialog ─────────────────────────────────────────
interface UserFormProps {
  user?: AdminUser | null
  csrfToken: string | null
  onSuccess: (u: AdminUser) => void
  onClose: () => void
}

function UserFormDialog({ user, csrfToken, onSuccess, onClose }: UserFormProps) {
  const isEdit = Boolean(user)
  const [fullName, setFullName] = useState(user?.fullName ?? "")
  const [username, setUsername] = useState(user?.username ?? "")
  const [role, setRole] = useState<UserRole>(user?.role ?? "TENAGA_KESEHATAN")
  const [profession, setProfession] = useState(user?.profession ?? "")
  const [unitId, setUnitId] = useState(user?.unitId ?? "IBS")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)
    try {
      let result: AdminUser
      if (isEdit && user) {
        result = await updateUser(
          user.id,
          { full_name: fullName, role, profession, unit_id: unitId },
          csrfToken ?? undefined,
        )
      } else {
        result = await createUser(
          { username, full_name: fullName, role, profession, unit_id: unitId, password },
          csrfToken ?? undefined,
        )
      }
      onSuccess(result)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Terjadi kesalahan.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className="relative z-10 w-full max-w-md rounded-xl border bg-card p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="user-form-title"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground" id="user-form-title">
            {isEdit ? "Edit Pengguna" : "Tambah Pengguna Baru"}
          </h2>
          <Button onClick={onClose} size="icon" variant="ghost" className="size-7" aria-label="Tutup">
            <IconX className="size-4" />
          </Button>
        </div>

        {errorMessage && (
          <div
            aria-live="polite"
            className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form className="flex flex-col gap-3" onSubmit={(e) => { void handleSubmit(e) }}>
          {!isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor="uf-username">
                Username <span className="text-destructive">*</span>
              </label>
              <input
                autoComplete="off"
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="uf-username"
                onChange={(e) => { setUsername(e.target.value) }}
                placeholder="Contoh: nakes_ibs"
                required
                type="text"
                value={username}
              />
              <p className="text-[11px] text-muted-foreground">
                Huruf kecil, angka, underscore. Tidak dapat diubah setelah dibuat.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="uf-fullname">
              Nama Lengkap <span className="text-destructive">*</span>
            </label>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="uf-fullname"
              onChange={(e) => { setFullName(e.target.value) }}
              placeholder="Ns. Nama Lengkap, S.Kep"
              required
              type="text"
              value={fullName}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="uf-role">
              Peran / Role <span className="text-destructive">*</span>
            </label>
            <select
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="uf-role"
              onChange={(e) => { setRole(e.target.value as UserRole) }}
              required
              value={role}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="uf-profession">
              Profesi / Jabatan <span className="text-destructive">*</span>
            </label>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="uf-profession"
              onChange={(e) => { setProfession(e.target.value) }}
              placeholder="Contoh: Perawat Bedah"
              required
              type="text"
              value={profession}
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-foreground" htmlFor="uf-unit">
              Unit / Instalasi
            </label>
            <input
              className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              id="uf-unit"
              onChange={(e) => { setUnitId(e.target.value) }}
              placeholder="IBS"
              type="text"
              value={unitId}
            />
          </div>

          {!isEdit && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-foreground" htmlFor="uf-password">
                Kata Sandi Awal <span className="text-destructive">*</span>
              </label>
              <input
                autoComplete="new-password"
                className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                id="uf-password"
                minLength={8}
                onChange={(e) => { setPassword(e.target.value) }}
                placeholder="Minimal 8 karakter"
                required
                type="password"
                value={password}
              />
              <p className="text-[11px] text-muted-foreground">
                Informasikan kata sandi kepada pengguna secara langsung. Tidak dapat dilihat kembali setelah disimpan.
              </p>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <Button onClick={onClose} size="sm" type="button" variant="outline">
              Batal
            </Button>
            <Button disabled={isSubmitting} size="sm" type="submit">
              {isSubmitting ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Pengguna"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Confirm dialog ───────────────────────────────────────────────
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  onClose,
}: {
  title: string
  body: string
  confirmLabel: string
  confirmVariant?: "default" | "destructive"
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div aria-hidden="true" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
      >
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-4 flex justify-end gap-2">
          <Button onClick={onClose} size="sm" variant="outline">
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            size="sm"
            variant={confirmVariant === "destructive" ? "outline" : "default"}
            className={confirmVariant === "destructive" ? "border-destructive text-destructive hover:bg-destructive/10" : ""}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export function UserManagementPage() {
  const { csrfToken } = useAuth()

  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  // Filters
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("")

  // Dialogs
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [confirmAction, setConfirmAction] = useState<{
    user: AdminUser
    action: "activate" | "deactivate"
  } | null>(null)

  const loadUsers = async () => {
    setIsLoading(true)
    setErrorMessage(null)
    try {
      const data = await listUsers({ search, role: roleFilter, active: activeFilter || undefined })
      setUsers(data)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar pengguna.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isMounted = true
    async function init() {
      try {
        const data = await listUsers({ search, role: roleFilter, active: activeFilter || undefined })
        if (!isMounted) return
        setUsers(data)
      } catch (err) {
        if (!isMounted) return
        setErrorMessage(err instanceof Error ? err.message : "Gagal memuat daftar pengguna.")
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    void init()
    return () => { isMounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUserSaved = (user: AdminUser) => {
    setUsers((prev) => {
      const existing = prev.findIndex((u) => u.id === user.id)
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = user
        return updated
      }
      return [user, ...prev]
    })
    setShowCreateDialog(false)
    setEditUser(null)
    setFeedback(`Pengguna "${user.fullName}" berhasil disimpan.`)
    setTimeout(() => { setFeedback(null) }, 4000)
  }

  const handleToggleActivation = async () => {
    if (!confirmAction) return
    const { user, action } = confirmAction
    setConfirmAction(null)
    try {
      const updated = await toggleUserActivation(user.id, action, csrfToken ?? undefined)
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      const label = action === "deactivate" ? "dinonaktifkan" : "diaktifkan"
      setFeedback(`Pengguna "${updated.fullName}" berhasil ${label}.`)
      setTimeout(() => { setFeedback(null) }, 4000)
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Gagal mengubah status pengguna.")
    }
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IconUsers className="size-4 text-primary" aria-hidden="true" />
            <span className="text-xs font-semibold tracking-wider text-primary uppercase">
              Administrator
            </span>
          </div>
          <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-foreground">
            Manajemen Pengguna
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Kelola akun staf IBS — tambah, edit, aktifkan, atau nonaktifkan pengguna.
          </p>
        </div>
        <Button
          className="gap-1.5 font-medium shrink-0"
          onClick={() => { setShowCreateDialog(true) }}
          size="sm"
        >
          <IconPlus className="size-4" />
          Tambah Pengguna
        </Button>
      </header>

      {/* Feedback */}
      {feedback && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
        >
          <IconCheck className="size-4 shrink-0" aria-hidden="true" />
          {feedback}
        </div>
      )}

      {/* Error */}
      {errorMessage && (
        <div
          aria-live="polite"
          className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive"
          role="alert"
        >
          <IconAlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {errorMessage}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
        <div className="relative flex-1">
          <IconSearch
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="w-full rounded-lg border bg-background py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            onChange={(e) => { setSearch(e.target.value) }}
            placeholder="Cari nama atau username..."
            type="search"
            value={search}
          />
        </div>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          onChange={(e) => { setRoleFilter(e.target.value) }}
          value={roleFilter}
          aria-label="Filter peran"
        >
          <option value="">Semua Peran</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select
          className="rounded-lg border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          onChange={(e) => { setActiveFilter(e.target.value as "" | "true" | "false") }}
          value={activeFilter}
          aria-label="Filter status"
        >
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
        <Button
          className="gap-1.5 shrink-0"
          onClick={() => { void loadUsers() }}
          size="sm"
          variant="outline"
        >
          <IconRefresh className="size-3.5" />
          Cari
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex min-h-48 items-center justify-center rounded-xl border bg-card">
          <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span>Memuat daftar pengguna...</span>
          </div>
        </div>
      ) : users.length === 0 ? (
        <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 py-10 text-center">
          <IconUsers className="size-8 text-muted-foreground/40" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold text-foreground">Tidak Ada Pengguna Ditemukan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ubah filter atau tambahkan pengguna baru.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border bg-card shadow-xs sm:block">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/30 text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nama Lengkap</th>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Peran</th>
                  <th className="px-4 py-3 font-medium">Profesi</th>
                  <th className="px-4 py-3 font-medium">Unit</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Dibuat</th>
                  <th className="px-4 py-3 text-right font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium text-foreground">{u.fullName}</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{u.username}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.profession}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.unitId}</td>
                    <td className="px-4 py-3">
                      <StatusBadge isActive={u.isActive} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(u.createdAt).toLocaleDateString("id-ID")}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          className="gap-1 text-xs"
                          onClick={() => { setEditUser(u) }}
                          size="sm"
                          variant="outline"
                        >
                          <IconEdit className="size-3.5" />
                          Edit
                        </Button>
                        {u.isActive ? (
                          <Button
                            className="gap-1 text-xs border-rose-200 text-rose-600 hover:bg-rose-50"
                            onClick={() => { setConfirmAction({ user: u, action: "deactivate" }) }}
                            size="sm"
                            variant="outline"
                          >
                            <IconUserOff className="size-3.5" />
                            Nonaktifkan
                          </Button>
                        ) : (
                          <Button
                            className="gap-1 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => { setConfirmAction({ user: u, action: "activate" }) }}
                            size="sm"
                            variant="outline"
                          >
                            <IconCheck className="size-3.5" />
                            Aktifkan
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="flex flex-col gap-2 sm:hidden">
            {users.map((u) => (
              <div key={u.id} className="rounded-xl border bg-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{u.fullName}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">{u.username}</p>
                  </div>
                  <StatusBadge isActive={u.isActive} />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <RoleBadge role={u.role} />
                  <span className="rounded-md border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                    {u.unitId}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-muted-foreground">{u.profession}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    className="flex-1 gap-1 text-xs"
                    onClick={() => { setEditUser(u) }}
                    size="sm"
                    variant="outline"
                  >
                    <IconEdit className="size-3.5" />
                    Edit
                  </Button>
                  {u.isActive ? (
                    <Button
                      className="flex-1 gap-1 text-xs border-rose-200 text-rose-600"
                      onClick={() => { setConfirmAction({ user: u, action: "deactivate" }) }}
                      size="sm"
                      variant="outline"
                    >
                      <IconUserOff className="size-3.5" />
                      Nonaktifkan
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 gap-1 text-xs border-emerald-200 text-emerald-700"
                      onClick={() => { setConfirmAction({ user: u, action: "activate" }) }}
                      size="sm"
                      variant="outline"
                    >
                      <IconCheck className="size-3.5" />
                      Aktifkan
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Total count */}
      {!isLoading && users.length > 0 && (
        <p className="text-right text-[11px] text-muted-foreground">
          Menampilkan {users.length} pengguna
        </p>
      )}

      {/* Dialogs */}
      {showCreateDialog && (
        <UserFormDialog
          csrfToken={csrfToken}
          onClose={() => { setShowCreateDialog(false) }}
          onSuccess={handleUserSaved}
        />
      )}

      {editUser && (
        <UserFormDialog
          user={editUser}
          csrfToken={csrfToken}
          onClose={() => { setEditUser(null) }}
          onSuccess={handleUserSaved}
        />
      )}

      {confirmAction && (
        <ConfirmDialog
          title={
            confirmAction.action === "deactivate"
              ? `Nonaktifkan ${confirmAction.user.fullName}?`
              : `Aktifkan ${confirmAction.user.fullName}?`
          }
          body={
            confirmAction.action === "deactivate"
              ? `Pengguna "${confirmAction.user.fullName}" (${confirmAction.user.username}) akan dinonaktifkan. Seluruh sesi aktif akan dicabut secara otomatis.`
              : `Pengguna "${confirmAction.user.fullName}" (${confirmAction.user.username}) akan diaktifkan kembali dan dapat masuk ke sistem.`
          }
          confirmLabel={confirmAction.action === "deactivate" ? "Nonaktifkan" : "Aktifkan"}
          confirmVariant={confirmAction.action === "deactivate" ? "destructive" : "default"}
          onClose={() => { setConfirmAction(null) }}
          onConfirm={() => { void handleToggleActivation() }}
        />
      )}
    </div>
  )
}
