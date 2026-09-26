import { REQUEST_ID_HEADER } from "./request-id"

export interface ApiSuccessMeta {
  requestId: string
  [key: string]: unknown
}

export interface ApiSuccessResponse<T> {
  data: T
  meta: ApiSuccessMeta
}

export interface ProblemFieldError {
  path: string
  code: string
  message: string
}

export interface ProblemDetails {
  type: string
  title: string
  status: number
  code: string
  detail: string
  instance: string
  requestId: string
  errors?: ProblemFieldError[]
}

export function jsonResponse(
  data: unknown,
  requestId: string,
  status = 200,
  headersInit: HeadersInit = {},
): Response {
  const headers = new Headers(headersInit)
  headers.set("Content-Type", "application/json; charset=utf-8")
  headers.set(REQUEST_ID_HEADER, requestId)
  headers.set("Cache-Control", "no-store, private")

  const body: ApiSuccessResponse<unknown> = {
    data,
    meta: { requestId },
  }

  return new Response(JSON.stringify(body), {
    status,
    headers,
  })
}

export function problemResponse(
  problem: {
    status: number
    code: string
    title: string
    detail: string
    instance: string
    errors?: ProblemFieldError[]
  },
  requestId: string,
  headersInit: HeadersInit = {},
): Response {
  const headers = new Headers(headersInit)
  headers.set("Content-Type", "application/problem+json; charset=utf-8")
  headers.set(REQUEST_ID_HEADER, requestId)
  headers.set("Cache-Control", "no-store, private")

  const body: ProblemDetails = {
    type: `https://sip-ikp.rsudwzjohannes.id/problems/${problem.code.toLowerCase().replaceAll("_", "-")}`,
    title: problem.title,
    status: problem.status,
    code: problem.code,
    detail: problem.detail,
    instance: problem.instance,
    requestId,
    ...(problem.errors ? { errors: problem.errors } : {}),
  }

  return new Response(JSON.stringify(body), {
    status: problem.status,
    headers,
  })
}
