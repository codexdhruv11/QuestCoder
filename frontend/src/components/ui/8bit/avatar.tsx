import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

const avatarVariants = cva(
  "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-none bit-card",
  {
    variants: {
      font: {
        normal: "",
        retro: "retro",
      }
    },
    defaultVariants: {
      font: "normal",
    },
  }
)

export interface AvatarProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, font, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(avatarVariants({ font }), className)}
      {...props}
    />
  )
)
Avatar.displayName = "Avatar"

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  <img
    ref={ref}
    className={cn("aspect-square h-full w-full", className)}
    {...props}
  />
))
AvatarImage.displayName = "AvatarImage"

export interface AvatarFallbackProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof avatarVariants> {}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, font, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-none bg-muted text-xs",
        font === "retro" && "retro",
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = "AvatarFallback"

export { Avatar, AvatarImage, AvatarFallback }