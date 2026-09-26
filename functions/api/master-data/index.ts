import type { CloudflareEnv } from "../../../src/types/cloudflare-env"
import type { RequestContextData } from "../../_shared/request-context"
import { jsonResponse } from "../../_shared/response"

interface MasterItem {
  id: string
  name: string
  code: string
}

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
}) => {
  const requestId = data.requestId

  const batchResults = await env.DB.batch([
    env.DB.prepare(
      "SELECT id, name, code FROM master_operating_rooms WHERE is_active = 1 ORDER BY code ASC;",
    ),
    env.DB.prepare(
      "SELECT id, name, code FROM master_specializations WHERE is_active = 1 ORDER BY name ASC;",
    ),
    env.DB.prepare(
      "SELECT id, name, code FROM master_departments WHERE is_active = 1 ORDER BY name ASC;",
    ),
    env.DB.prepare(
      "SELECT id, name, code FROM master_payer_types WHERE is_active = 1 ORDER BY name ASC;",
    ),
  ])

  const roomsResult = batchResults[0]?.results ?? []
  const specializationsResult = batchResults[1]?.results ?? []
  const departmentsResult = batchResults[2]?.results ?? []
  const payerTypesResult = batchResults[3]?.results ?? []

  return jsonResponse(
    {
      operatingRooms: roomsResult as unknown as MasterItem[],
      specializations: specializationsResult as unknown as MasterItem[],
      departments: departmentsResult as unknown as MasterItem[],
      payerTypes: payerTypesResult as unknown as MasterItem[],
    },
    requestId,
  )
}
