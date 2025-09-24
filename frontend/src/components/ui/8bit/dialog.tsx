import * as React from "react"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

interface DialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  font?: "normal" | "retro"
}

export function Dialog({ children, open = true, onOpenChange, font }: DialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
      onClick={() => onOpenChange?.(false)}
    >
      <div onClick={(e) => e.stopPropagation()} className={cn(font === "retro" && "retro")}>
        {children}
      </div>
    </div>
  )
}

export function DialogContent({
  children,
  className,
  font
}: {
  children: React.ReactNode
  className?: string
  font?: "normal" | "retro"
}) {
  return (
    <div
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-none bit-card sm:rounded-none",
        font === "retro" && "retro",
        className
      )}
    >
      {children}
    </div>
  )
}

export function DialogHeader({
  children,
  font
}: {
  children: React.ReactNode
  font?: "normal" | "retro"
}) {
  return (
    <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", font === "retro" && "retro")}>
      {children}
    </div>
  )
}

export function DialogTitle({
  children,
  font
}: {
  children: React.ReactNode
  font?: "normal" | "retro"
}) {
  return (
    <h3 className={cn("text-lg font-semibold leading-none tracking-tight", font === "retro" && "retro text-sm")}>
      {children}
    </h3>
  )
}

export function DialogTrigger({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}