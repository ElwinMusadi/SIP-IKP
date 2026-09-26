import type { CloudflareEnv } from "../../src/types/cloudflare-env"
import type { RequestContextData } from "../_shared/request-context"

export const onRequestGet: PagesFunction<CloudflareEnv, string, RequestContextData> = async ({
  env,
  data,
}) => {
  return Response.json(
    {
      status: "ok",
      service: "sip-ikp-pages-functions",
      environment: env.APP_ENV,
      requestId: data.requestId,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  )
}
