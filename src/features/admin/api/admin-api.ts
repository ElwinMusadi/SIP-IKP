export type UserRole = "TENAGA_KESEHATAN" | "KEPALA_RUANGAN" | "KOMITE_PMKP" | "ADMINISTRATOR"

export interface AdminUser {
  id: string
  username: string
  fullName: string
  role: UserRole
  profession: string
  unitId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateUserInput {
  username: string
  full_name: string
  role: UserRole
  profession: string
  unit_id?: string
  password: string
}

export interface UpdateUserInput {
  full_name: string
  role: UserRole
  profession: string
  unit_id?: string
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = "Terjadi kesalahan saat memproses permintaan."
    try {
      const problem: { detail?: string; message?: string } = await res.json()
      if (problem.detail) errorDetail = problem.detail
      else if (problem.message) errorDetail = problem.message
    } catch {
      // ignore
    }
    throw new Error(errorDetail)
  }
  const payload: { data: T } = await res.json()
  return payload.data
}

export interface ListUsersFilters {
  search?: string
  role?: string
  active?: "true" | "false" | "" | undefined
}

export async function listUsers(filters: ListUsersFilters = {}): Promise<AdminUser[]> {
  const q = new URLSearchParams()
  if (filters.search) q.set("search", filters.search)
  if (filters.role) q.set("role", filters.role)
  if (filters.active) q.set("active", filters.active)
  const url = q.toString() ? `/api/admin/users?${q.toString()}` : "/api/admin/users"
  const res = await fetch(url)
  return handleResponse<AdminUser[]>(res)
}

export async function getUser(id: string): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`)
  return handleResponse<AdminUser>(res)
}

export async function createUser(
  input: CreateUserInput,
  csrfToken?: string,
): Promise<AdminUser> {
  const res = await fetch("/api/admin/users", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<AdminUser>(res)
}

export async function updateUser(
  id: string,
  input: UpdateUserInput,
  csrfToken?: string,
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify(input),
  })
  return handleResponse<AdminUser>(res)
}

export async function toggleUserActivation(
  id: string,
  action: "activate" | "deactivate",
  csrfToken?: string,
): Promise<AdminUser> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ action }),
  })
  return handleResponse<AdminUser>(res)
}

export async function deleteUser(id: string, csrfToken?: string): Promise<{ deleted: boolean }> {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
  })
  return handleResponse<{ deleted: boolean }>(res)
}

export async function changeUserPassword(
  id: string,
  password: string,
  csrfToken?: string,
): Promise<{ passwordChanged: boolean; id: string }> {
  const res = await fetch(`/api/admin/users/${id}/password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    },
    body: JSON.stringify({ password }),
  })
  return handleResponse<{ passwordChanged: boolean; id: string }>(res)
}
