"use client";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, XCircleIcon, InfoIcon, AlertTriangleIcon } from "lucide-react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS = {
  success: CheckIcon,
  error:   XCircleIcon,
  info:    InfoIcon,
  warning: AlertTriangleIcon,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timers.current.has(id)) {
      clearTimeout(timers.current.get(id)!);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-2), { id, message, type }]);
    const timer = setTimeout(() => dismiss(id), 2800);
    timers.current.set(id, timer);
  }, [dismiss]);

  useEffect(() => {
    const ref = timers.current;
    return () => { ref.forEach(t => clearTimeout(t)); };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* iOS-style banners — top center */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none w-full max-w-sm px-4">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => {
            const Icon = ICONS[t.type];
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: -48, scale: 0.92 }}
                animate={{ opacity: 1, y: 0,   scale: 1    }}
                exit={{    opacity: 0, y: -24,  scale: 0.94 }}
                transition={{ type: "spring", bounce: 0.25, duration: 0.45 }}
                onClick={() => dismiss(t.id)}
                className="pointer-events-auto w-full flex items-center gap-3 px-4 py-3 rounded-[18px] cursor-pointer"
                style={{
                  background: "rgba(30, 30, 30, 0.88)",
                  backdropFilter: "saturate(180%) blur(24px)",
                  WebkitBackdropFilter: "saturate(180%) blur(24px)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 2px 8px rgba(0,0,0,0.2)",
                }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  t.type === "success" ? "bg-[#30D158]" :
                  t.type === "error"   ? "bg-[#FF453A]" :
                  t.type === "warning" ? "bg-[#FFD60A]" :
                  "bg-[#0A84FF]"
                }`}>
                  <Icon className="w-3.5 h-3.5 text-black" strokeWidth={2.5} />
                </div>
                <span className="text-[14px] font-medium text-white flex-1 text-left leading-snug">{t.message}</span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
