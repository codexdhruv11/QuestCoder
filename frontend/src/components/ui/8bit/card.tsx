import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

const cardVariants = cva(
  "rounded-none bit-card",
  {
    variants: {
      font: {
        normal: "",
        retro: "retro",
      }
    },
    defaultVariants: {
      font: "normal"
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, font, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(cardVariants({ font, className }))}
      {...props}
    />
  )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { font?: "normal" | "retro" }
>(({ className, font, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 p-6", font === "retro" && "retro", className)}
    {...props}
  />
))
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement> & { font?: "normal" | "retro" }
>(({ className, font, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn("text-2xl font-semibold leading-none tracking-tight", font === "retro" && "retro text-lg", className)}
    {...props}
  />
))
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement> & { font?: "normal" | "retro" }
>(({ className, font, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", font === "retro" && "retro text-xs", className)}
    {...props}
  />
))
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { font?: "normal" | "retro" }
>(({ className, font, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("p-6 pt-0", font === "retro" && "retro", className)}
    {...props}
  />
))
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { font?: "normal" | "retro" }
>(({ className, font, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center p-6 pt-0", font === "retro" && "retro", className)}
    {...props}
  />
))
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }