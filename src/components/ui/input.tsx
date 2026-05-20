import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full bg-zinc-900 border border-zinc-800 px-3 py-3 text-sm ring-offset-zinc-950 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-zinc-700 focus-visible:outline-none focus-visible:border-amber-500/50 disabled:cursor-not-allowed disabled:opacity-50 transition-colors rounded-none text-white",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
