"use client";

import * as React from "react";
import { AdaptiveSheet, AdaptiveSheetBody } from "@/components/ui/adaptive-sheet";
import { cn } from "@/lib/utils";

export interface ContextAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ContextActionBindings {
  onContextMenu: React.MouseEventHandler;
  onPointerDown: React.PointerEventHandler;
  onPointerMove: React.PointerEventHandler;
  onPointerUp: React.PointerEventHandler;
  onPointerCancel: React.PointerEventHandler;
}

export function useLongPress(onLongPress: () => void, delayMs = 500) {
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const start = React.useRef<{ x: number; y: number } | null>(null);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    start.current = null;
  }, []);

  React.useEffect(() => cancel, [cancel]);

  return {
    onPointerDown: (event: React.PointerEvent) => {
      if (event.pointerType === "mouse") return;
      start.current = { x: event.clientX, y: event.clientY };
      timer.current = setTimeout(() => {
        timer.current = null;
        onLongPress();
      }, delayMs);
    },
    onPointerMove: (event: React.PointerEvent) => {
      if (!start.current) return;
      if (Math.hypot(event.clientX - start.current.x, event.clientY - start.current.y) > 10) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
  } satisfies Omit<ContextActionBindings, "onContextMenu">;
}

export function ContextActions(props: {
  actions: ContextAction[];
  title?: string;
  children: (bindings: ContextActionBindings) => React.ReactNode;
}) {
  const [sheetOpen, setSheetOpen] = React.useState(false);
  const [point, setPoint] = React.useState<{ x: number; y: number } | null>(null);
  const longPress = useLongPress(() => setSheetOpen(true));

  React.useEffect(() => {
    if (!point) return;
    const close = () => setPoint(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
    };
  }, [point]);

  const run = (action: ContextAction) => {
    if (action.disabled) return;
    setPoint(null);
    setSheetOpen(false);
    action.onSelect();
  };

  const bindings: ContextActionBindings = {
    ...longPress,
    onContextMenu: (event) => {
      event.preventDefault();
      setPoint({ x: event.clientX, y: event.clientY });
    },
  };

  return (
    <>
      {props.children(bindings)}
      {point && (
        <div className="vault-context-menu" role="menu" style={{ left: point.x, top: point.y }} onPointerDown={(event) => event.stopPropagation()}>
          {props.actions.map((action) => <ContextActionButton key={action.id} action={action} onSelect={() => run(action)} />)}
        </div>
      )}
      <AdaptiveSheet open={sheetOpen} onOpenChange={setSheetOpen} title={props.title ?? "Actions"} size="sm" className="vault-context-sheet">
        <AdaptiveSheetBody className="vault-context-actions">
          {props.actions.map((action) => <ContextActionButton key={action.id} action={action} onSelect={() => run(action)} />)}
        </AdaptiveSheetBody>
      </AdaptiveSheet>
    </>
  );
}

function ContextActionButton({ action, onSelect }: { action: ContextAction; onSelect: () => void }) {
  const Icon = action.icon;
  return (
    <button
      type="button"
      role="menuitem"
      disabled={action.disabled}
      className={cn("vault-context-action system-interactive", action.destructive && "is-destructive")}
      onClick={onSelect}
    >
      {Icon && <Icon className="h-4 w-4" />}
      <span>{action.label}</span>
    </button>
  );
}
