"use client";

import * as React from "react";
import { useEffect, useRef } from "react";
import { type PanInfo, animate, motion, useDragControls, useMotionValue, useReducedMotion } from "framer-motion";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { cn } from "@/lib/utils";

type SheetSize = "sm" | "md" | "lg";

const sizeClasses: Record<SheetSize, string> = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-xl",
  lg: "sm:max-w-4xl",
};

// Matches the mobile sheet-slide spring already used by PasswordVault's
// hand-rolled detail pane, for a consistent house feel.
const SHEET_SPRING = { type: "spring" as const, damping: 30, stiffness: 240 };
const DISMISS_DISTANCE = 120;
// Calibrated empirically against real onDragEnd values from this installed
// framer-motion version: an unhurried drag measured ~80, a deliberate flick
// measured ~900 -- 500 sits well clear of both.
const DISMISS_VELOCITY = 500;

export function AdaptiveSheet(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  size?: SheetSize;
  children: React.ReactNode;
  className?: string;
}) {
  const isDesktop = useIsDesktop();
  const reduceMotion = useReducedMotion();
  const dragEnabled = !isDesktop && !reduceMotion;

  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const popupRef = useRef<HTMLDivElement>(null);
  // Set while a drag-dismiss's fly-away animation is in flight, so the effect
  // below can tell a real close apart from one the consumer vetoed (e.g. a
  // save in progress) once `props.open` settles.
  const dismissingRef = useRef(false);

  useEffect(() => {
    if (!dragEnabled || !dismissingRef.current) return;
    dismissingRef.current = false;
    if (props.open) {
      // Vetoed: the sheet was already animating off-screen, but the consumer
      // refused to close. Spring it back into view instead of leaving it
      // flung out of sight while still technically open.
      animate(y, 0, { ...SHEET_SPRING, velocity: y.getVelocity() });
    }
    // Otherwise the close succeeded -- let the fly-away animation already in
    // flight finish naturally.
  }, [props.open, dragEnabled, y]);

  const startDrag = (event: React.PointerEvent) => {
    if (dragEnabled) dragControls.start(event);
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const shouldDismiss = info.offset.y > DISMISS_DISTANCE || info.velocity.y > DISMISS_VELOCITY;
    if (!shouldDismiss) {
      animate(y, 0, { ...SHEET_SPRING, velocity: info.velocity.y });
      return;
    }
    dismissingRef.current = true;
    const target = (popupRef.current?.getBoundingClientRect().height ?? window.innerHeight) + 80;
    // Close synchronously (same timing as Escape/backdrop-press) so a
    // consumer veto is discovered immediately, not after the fly-away
    // animation has already finished -- see the effect above.
    props.onOpenChange(false);
    animate(y, target, { ...SHEET_SPRING, velocity: info.velocity.y });
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent
        className={cn("adaptive-sheet system-motion", sizeClasses[props.size ?? "md"], props.className)}
        render={
          dragEnabled ? (
            <motion.div
              ref={popupRef}
              style={{ y }}
              drag="y"
              dragListener={false}
              dragControls={dragControls}
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0.2 }}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              transition={SHEET_SPRING}
            />
          ) : undefined
        }
      >
        <span className="adaptive-sheet-grabber" aria-hidden="true" onPointerDown={startDrag} />
        <div className="adaptive-sheet-heading" onPointerDown={startDrag}>
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
