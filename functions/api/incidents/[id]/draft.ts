import type { CloudflareEnv } from "../../../../src/types/cloudflare-env"
import type { RequestContextData } from "../../../_shared/request-context"
import { onRequestPatch as handlePatch } from "../[id]"

export const onRequestPatch: PagesFunction<CloudflareEnv, "id", RequestContextData> = async (
  context,
) => {
  return handlePatch(context)
}
