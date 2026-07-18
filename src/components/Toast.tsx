"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AlertTriangleIcon, CheckIcon, InfoIcon, XCircleIcon, XIcon } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  message: string;
  type?: ToastType;
  durationMs?: number | null;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

export interface ToastHandle {
  id: string;
  dismiss: () => void;
}

interface ToastRecord extends Required<Pick<ToastOptions, "message" | "type">> {
  id: string;
  durationMs: number | null;
  actionLabel?: string;
  onAction?: () => void | Promise<void>;
}

interface ToastContextValue {
  toast: (messageOrOptions: string | ToastOptions, legacyType?: ToastType) => ToastHandle;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = { 
  success: <div className="w-8 h-8 rounded-full bg-green-500/15 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0"><CheckIcon className="w-4 h-4" strokeWidth={3} /></div>, 
  error: <div className="w-8 h-8 rounded-full bg-red-500/15 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0"><XCircleIcon className="w-4 h-4" strokeWidth={3} /></div>, 
  info: <div className="w-8 h-8 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0"><InfoIcon className="w-4 h-4" strokeWidth={3} /></div>, 
  warning: <div className="w-8 h-8 rounded-full bg-orange-500/15 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0"><AlertTriangleIcon className="w-4 h-4" strokeWidth={3} /></div> 
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const prefersReducedMotion = useReducedMotion();

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback((messageOrOptions: string | ToastOptions, legacyType: ToastType = "success"): ToastHandle => {
    const options: ToastOptions = typeof messageOrOptions === "string"
      ? { message: messageOrOptions, type: legacyType }
      : messageOrOptions;
    const id = crypto.randomUUID();
    const record: ToastRecord = {
      id,
      message: options.message,
      type: options.type ?? "success",
      durationMs: options.durationMs === undefined ? 3200 : options.durationMs,
      actionLabel: options.actionLabel,
      onAction: options.onAction,
    };
    setToasts((current) => [...current.slice(-2), record]);
    if (record.durationMs !== null) {
      timers.current.set(id, setTimeout(() => dismiss(id), record.durationMs));
    }
    return { id, dismiss: () => dismiss(id) };
  }, [dismiss]);

  useEffect(() => {
    const activeTimers = timers.current;
    return () => activeTimers.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed z-[9999] top-4 md:top-8 left-1/2 -translate-x-1/2 flex flex-col gap-3 pointer-events-none w-[90vw] max-w-[360px]" role="region" aria-label="Notifications">
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const hasAction = Boolean(item.actionLabel && item.onAction);
            return (
              <motion.div
                key={item.id}
                layout={!prefersReducedMotion}
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -40, scale: 0.9, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -20, scale: 0.9, filter: "blur(8px)" }}
                transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", bounce: 0.3, duration: 0.5 }}
                className="pointer-events-auto flex items-center gap-3 p-2.5 pr-4 bg-background/80 backdrop-blur-3xl border border-border/40 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[100px]"
                role={item.type === "error" ? "alert" : "status"}
              >
                {ICONS[item.type]}
                <span className="flex-1 text-[13.5px] font-semibold text-foreground tracking-tight leading-tight pt-0.5">
                  {item.message}
                </span>
                {hasAction && (
                  <button
                    type="button"
                    className="text-[13px] font-bold text-primary hover:text-primary/80 transition-colors px-2"
                    onClick={async () => {
                      await item.onAction?.();
                      dismiss(item.id);
                    }}
                  >
                    {item.actionLabel}
                  </button>
                )}
                <button type="button" className="text-muted-foreground/40 hover:text-foreground transition-colors p-1" onClick={() => dismiss(item.id)} aria-label="Dismiss notification">
                  <XIcon className="w-[18px] h-[18px]" strokeWidth={2.5} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context.toast;
}
