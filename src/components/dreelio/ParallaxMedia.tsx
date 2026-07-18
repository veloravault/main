"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { LANDING_VIEWPORT, revealVariants } from "./motion";

type Props = {
  children: ReactNode;
  className?: string;
  distance?: number;
  delay?: number;
  /**
   * Set for above-the-fold usage (e.g. the homepage hero). Skips the
   * hidden→shown entrance animation so the element never ships as
   * `opacity:0` in the server-rendered HTML — that gates the LCP element
   * behind JS hydration, which reproduces in production, not just dev.
   * Scroll-linked parallax (the `y` transform) is unaffected either way.
   */
  aboveFold?: boolean;
};

export function ParallaxMedia({
  children,
  className,
  distance = 14,
  delay = 0,
  aboveFold = false,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [-distance, distance]);

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ y: reduceMotion ? 0 : y }}
      initial={reduceMotion || aboveFold ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
      variants={revealVariants(18, delay)}
    >
      {children}
    </motion.div>
  );
}
