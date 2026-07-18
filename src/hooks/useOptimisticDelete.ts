"use client";

import { useCallback, useEffect, useRef } from "react";
import { useToast } from "@/components/Toast";

interface PendingDelete<T> {
  item: T;
  index: number;
  timer: ReturnType<typeof setTimeout>;
}

export function useOptimisticDelete<T extends { id: string }>(options: {
  items: T[];
  setItems: React.Dispatch<React.SetStateAction<T[]>>;
  commitDelete: (item: T) => Promise<void>;
  toastLabel: (item: T) => string;
}) {
  const toast = useToast();
  const latest = useRef(options);
  const pending = useRef(new Map<string, PendingDelete<T>>());
  useEffect(() => {
    latest.current = options;
  }, [options]);

  const restore = useCallback((record: PendingDelete<T>) => {
    latest.current.setItems((current) => {
      if (current.some((item) => item.id === record.item.id)) return current;
      const next = [...current];
      next.splice(Math.min(record.index, next.length), 0, record.item);
      return next;
    });
  }, []);

  const commit = useCallback(async (id: string) => {
    const record = pending.current.get(id);
    if (!record) return;
    pending.current.delete(id);
    try {
      await latest.current.commitDelete(record.item);
    } catch (reason) {
      restore(record);
      toast({ message: reason instanceof Error ? reason.message : "Delete failed. The item was restored.", type: "error" });
    }
  }, [restore, toast]);

  const scheduleDelete = useCallback((item: T) => {
    if (pending.current.has(item.id)) return;
    const index = latest.current.items.findIndex((candidate) => candidate.id === item.id);
    if (index < 0) return;
    latest.current.setItems((current) => current.filter((candidate) => candidate.id !== item.id));
    const timer = setTimeout(() => void commit(item.id), 6000);
    const record = { item, index, timer };
    pending.current.set(item.id, record);
    toast({
      message: `${latest.current.toastLabel(item)} deleted`,
      type: "info",
      durationMs: 6000,
      actionLabel: "Undo",
      onAction: () => {
        const active = pending.current.get(item.id);
        if (!active) return;
        clearTimeout(active.timer);
        pending.current.delete(item.id);
        restore(active);
      },
    });
  }, [commit, restore, toast]);

  useEffect(() => () => {
    // Intentionally keep pending server records when navigating away. This is safer than
    // committing a destructive action after the Undo UI has disappeared.
    pending.current.forEach((record) => clearTimeout(record.timer));
    pending.current.clear();
  }, []);

  return { scheduleDelete };
}
