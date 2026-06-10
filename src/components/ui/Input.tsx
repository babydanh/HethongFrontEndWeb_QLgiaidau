import * as React from "react"
import { cn } from "@/utils/cn"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  label?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, label, ...props }, ref) => {
    return (
      <div className="w-full relative flex flex-col gap-1.5">
        {label && (
          <label className="text-sm font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="relative w-full">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:border-blue-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 transition-colors duration-200",
            error && "border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500",
            icon && "pl-10",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="absolute -bottom-5 text-xs font-semibold text-red-500 left-1">{error}</p>
        )}
        </div>
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
