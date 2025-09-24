import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

interface TabsProps {
  children: React.ReactNode
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  font?: "normal" | "retro"
}

export function Tabs({ children, className, font }: TabsProps) {
  return (
    <div className={cn(className, font === "retro" && "retro")}>
      {children}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  font?: "normal" | "retro"
}

export function TabsList({ children, className, font }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-none bit-card p-1",
        font === "retro" && "retro",
        className
      )}
    >
      {children}
    </div>
  )
}

const tabsTriggerVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bit-button",
  {
    variants: {
      font: {
        normal: "",
        retro: "retro text-xs",
      }
    },
    defaultVariants: {
      font: "normal",
    },
  }
)

interface TabsTriggerProps extends VariantProps<typeof tabsTriggerVariants> {
  children: React.ReactNode
  value: string
  className?: string
  [key: string]: any
}

export function TabsTrigger({ children, value, className, font, ...props }: TabsTriggerProps) {
  return (
    <button
      className={cn(tabsTriggerVariants({ font }), className)}
      {...props}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  children: React.ReactNode
  value: string
  className?: string
  font?: "normal" | "retro"
}

export function TabsContent({ children, className, font }: TabsContentProps) {
  return (
    <div className={cn("mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2", font === "retro" && "retro", className)}>
      {children}
    </div>
  )
}