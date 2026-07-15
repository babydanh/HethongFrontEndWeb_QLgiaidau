import { cn } from "@/utils/cn";
import * as React from "react";

const LoadingSpinner = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  // Strip 'animate-spin' from the parent wrapper to prevent the logo from spinning
  const cleanClassName = className ? className.replace(/\banimate-spin\b/g, '') : '';

  return (
    <div
      ref={ref}
      className={cn("relative flex items-center justify-center shrink-0", cleanClassName)}
      {...props}
    >
      {/* Outer spinning border */}
      <div className="absolute inset-0 rounded-full border-2 border-slate-200 border-t-blue-600 animate-spin" />
      
      {/* Inner logo */}
      <img
        src="/vndcsport.svg"
        alt="Loading..."
        className="w-[60%] h-[60%] object-contain animate-pulse"
      />
    </div>
  );
});
LoadingSpinner.displayName = "LoadingSpinner";

export { LoadingSpinner };
