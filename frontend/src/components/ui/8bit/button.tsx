import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import "./styles/retro.css"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bit-button active:translate-y-1",
  {
    variants: {
      variant: {
        default: "bit-primary",
        destructive: "bit-destructive",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground bit-card",
        secondary: "bit-secondary",
        ghost: "hover:bg-accent hover:text-accent-foreground bg-transparent border-none shadow-none",
        link: "text-primary underline-offset-4 hover:underline bg-transparent border-none shadow-none",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3",
        lg: "h-11 px-8",
        icon: "h-10 w-10",
      },
      font: {
        normal: "",
        retro: "retro text-xs",
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      font: "normal"
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, font, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, font, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }