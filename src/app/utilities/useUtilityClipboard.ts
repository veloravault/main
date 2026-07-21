"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ClipboardStatus = "idle" | "copied" | "manual";

export function useUtilityClipboard(value: string) {
  const outputRef = useRef<HTMLOutputElement>(null);
  const [status, setStatus] = useState<ClipboardStatus>("idle");

  useEffect(() => {
    if (status === "idle") return;
    const timeout = window.setTimeout(() => setStatus("idle"), 2200);
    return () => window.clearTimeout(timeout);
  }, [status]);

  const selectOutput = useCallback(() => {
    const node = outputRef.current;
    if (!node) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }, []);

  const copy = useCallback(async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setStatus("copied");
    } catch {
      selectOutput();
      setStatus("manual");
    }
  }, [selectOutput, value]);

  return { copy, outputRef, status, reset: () => setStatus("idle") };
}
