import * as React from "react";
import { cn } from "@/utils/cn";

const getVariantClasses = (variant: BadgeProps["variant"]) => {
  const baseClasses =
    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

  const variantClasses = {
    primary: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-primary-light text-primary",
    success: "border-transparent bg-success text-primary-foreground",
    danger: "border-transparent bg-danger text-primary-foreground",
    warning: "border-transparent bg-warning text-primary-foreground",
    outline: "text-foreground",
  };

  return cn(baseClasses, variantClasses[variant || "primary"]);
};

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "outline";
}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(getVariantClasses(variant), className)} {...props} />
  );
}

export { Badge };
