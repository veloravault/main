"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SheetSize = "sm" | "md" | "lg";

const sizeClasses: Record<SheetSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-xl",
  lg: "sm:max-w-4xl",
};

export function AdaptiveSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: SheetSize;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className={cn("adaptive-sheet system-motion", sizeClasses[props.size ?? "md"], props.className)}>
        <span className="adaptive-sheet-grabber" aria-hidden="true" />
        <div className="adaptive-sheet-heading">
          <DialogTitle>{props.title}</DialogTitle>
          {props.description && <DialogDescription>{props.description}</DialogDescription>}
        </div>
        {props.children}
      </DialogContent>
    </Dialog>
  );
}

export function AdaptiveSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("adaptive-sheet-body", className)} {...props} />;
}

export function AdaptiveSheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("adaptive-sheet-footer", className)} {...props} />;
}
