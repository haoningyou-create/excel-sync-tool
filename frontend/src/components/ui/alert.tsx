import * as React from "react";
import { cn } from "@/lib/utils";

export function Alert({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "warning" | "error" | "success";
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3 text-sm",
        variant === "default" && "border-slate-200 bg-slate-50 text-slate-700",
        variant === "warning" && "border-amber-200 bg-amber-50 text-amber-900",
        variant === "error" && "border-red-200 bg-red-50 text-red-900",
        variant === "success" && "border-emerald-200 bg-emerald-50 text-emerald-900",
        className
      )}
      {...props}
    />
  );
}
