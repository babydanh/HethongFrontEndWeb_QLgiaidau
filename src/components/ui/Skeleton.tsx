import { cn } from "@/utils/cn";

/** Base skeleton atom — animate-pulse block */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-slate-200", className)}
      {...props}
    />
  );
}

/** Skeleton for a line of text. Vary width via className e.g. `w-3/4` */
function SkeletonText({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse h-3.5 rounded bg-slate-200", className)}
      {...props}
    />
  );
}

/** Skeleton for a circular avatar */
function SkeletonAvatar({
  className,
  size = "md",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    sm: "h-7 w-7",
    md: "h-9 w-9",
    lg: "h-14 w-14",
    xl: "h-20 w-20",
  }[size];
  return (
    <div
      className={cn(
        "animate-pulse rounded-full bg-slate-200 shrink-0",
        sizeClass,
        className,
      )}
      {...props}
    />
  );
}

/** Skeleton for a small inline badge / pill chip */
function SkeletonBadge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse h-5 w-14 rounded-full bg-slate-200",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonBadge };

