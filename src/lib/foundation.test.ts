import { describe, expect, it } from "vitest"

import { cn } from "@/lib/utils"

describe("development foundation", () => {
  it("merges Tailwind class names through the shadcn utility", () => {
    expect(cn("px-2", "py-3")).toBe("px-2 py-3")
  })
})
