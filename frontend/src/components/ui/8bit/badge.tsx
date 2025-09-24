import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

const badgeVariants = cva(
  "inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 bit-button",
  {
    variants: {
      variant: {
        default: "bit-primary border-transparent text-primary-foreground",
        secondary: "bit-secondary border-transparent",
        destructive: "bit-destructive border-transparent text-destructive-foreground",
        outline: "text-foreground bit-card",
      },
      font: {
        normal: "",
        retro: "retro text-xs",
      }
    },
    defaultVariants: {
      variant: "default",
      font: "normal",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, font, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant, font }), className)} {...props} />
  )
}

export { Badge, badgeVariants }