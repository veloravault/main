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
};

export function ParallaxMedia({
  children,
  className,
  distance = 14,
  delay = 0,
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
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
      variants={revealVariants(18, delay)}
    >
      {children}
    </motion.div>
  );
}
