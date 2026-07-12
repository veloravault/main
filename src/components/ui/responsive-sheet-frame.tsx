import { cn } from "@/lib/utils";

export function ResponsiveSheetFrame({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("apple-bottom-sheet", className)}><div className="apple-sheet-grabber" aria-hidden="true" />{children}</div>;
}
