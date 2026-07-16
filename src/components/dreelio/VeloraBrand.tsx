"use client";

import Image from "next/image";
import { useTheme } from "@/components/ThemeProvider";

export function VeloraBrandMark({ className }: { className?: string }) {
  const { resolvedTheme } = useTheme();
  const src = resolvedTheme === "dark" ? "/brand/velora-mark-dark.png" : "/brand/velora-mark-light.png";

  return <Image src={src} alt="" width={64} height={64} className={className} />;
}
