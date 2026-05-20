import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cn } from "@/lib/utils"

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
  variant?: "default" | "outline" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap text-xs font-bold uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-500 disabled:pointer-events-none disabled:opacity-50",
          {
            "bg-amber-500 text-black shadow-lg shadow-amber-500/10 hover:bg-amber-400": variant === "default",
            "border border-zinc-800 bg-transparent text-white hover:bg-zinc-900": variant === "outline",
            "hover:bg-zinc-900 hover:text-white text-zinc-400": variant === "ghost",
            "underline-offset-4 hover:underline text-amber-500": variant === "link",
            "px-6 py-2 h-auto": size === "default",
            "px-4 py-1.5 text-[10px] h-auto": size === "sm",
            "px-8 py-3 text-sm h-auto": size === "lg",
            "h-10 w-10": size === "icon",
          },
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
