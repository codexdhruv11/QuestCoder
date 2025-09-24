import * as React from "react"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-none bg-muted bit-card",
        className
      )}
      {...props}
    />
  )
}

export { Skeleton }