import { cn } from "@/lib/utils";

export function AppleGroupLabel({ children, className }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("type-group-label mb-2 px-4", className)}>{children}</p>;
}

export function AppleGroupedList({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("apple-grouped-list", className)}>{children}</div>;
}

export function AppleGroupedRow({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("apple-grouped-row", className)} {...props}>{children}</div>;
}
