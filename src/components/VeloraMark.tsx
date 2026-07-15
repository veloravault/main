"use client";

import { useTheme } from "@/components/ThemeProvider";

export function VeloraMark({ className = "", style, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  const { resolvedTheme } = useTheme();
  const logoSrc = resolvedTheme === "dark"
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
