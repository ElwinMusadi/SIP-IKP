import * as React from "react"

import { IconLoader } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

function Spinner({
  className,
  ...props
}: Omit<React.ComponentProps<typeof IconLoader>, "className"> & {
  className?: string
}) {
  return (
    <IconLoader data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
