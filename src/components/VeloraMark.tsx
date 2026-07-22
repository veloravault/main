"use client";

import { useTheme } from "@/components/ThemeProvider";

type VeloraMarkProps = React.HTMLAttributes<HTMLSpanElement> & {
  /** Force a specific mark instead of following the app theme - for surfaces (e.g. a colored sidebar) whose background doesn't flip with light/dark mode. */
  tone?: "light" | "dark";
};

export function VeloraMark({ className = "", style, tone, ...props }: VeloraMarkProps) {
  const { resolvedTheme } = useTheme();
  const effectiveTone = tone ?? resolvedTheme;
  const logoSrc = effectiveTone === "dark"
    ? "/brand/velora-mark-dark.png"
    : "/brand/velora-mark-light.png";

  return (
    <span
      className={className}
      style={{
        position: "relative",
        display: "inline-block",
        overflow: "hidden",
        lineHeight: 0,
        ...style,
      }}
      {...props}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoSrc}
        alt=""
        style={{ display: "block", width: "100%", height: "100%", objectFit: "contain" }}
      />
    </span>
  );
}
