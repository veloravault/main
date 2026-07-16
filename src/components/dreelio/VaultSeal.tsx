"use client";

import { motion, useReducedMotion } from "framer-motion";
import { VeloraBrandMark } from "./VeloraBrand";
import styles from "./VaultSeal.module.css";

type VaultSealProps = {
  className?: string;
  compact?: boolean;
};

const LOOPS = [
  { rotate: -45, x: -13, y: -13 },
  { rotate: 45, x: 13, y: -13 },
  { rotate: 45, x: -13, y: 13 },
  { rotate: -45, x: 13, y: 13 },
] as const;

export function VaultSeal({ className, compact = false }: VaultSealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <span
      className={`${styles.seal} ${compact ? styles.compact : ""} ${className ?? ""}`}
      aria-hidden="true"
    >
      <span className={styles.glass} />
      {LOOPS.map((loop, index) => (
        <motion.span
          key={`${loop.x}-${loop.y}`}
          className={styles.loop}
          initial={reduceMotion ? false : { opacity: 0, x: loop.x * 1.8, y: loop.y * 1.8, rotate: loop.rotate - 24, scale: 0.76 }}
          whileInView={{ opacity: 1, x: loop.x, y: loop.y, rotate: loop.rotate, scale: 1 }}
          viewport={{ once: true, amount: 0.7 }}
          transition={{ delay: index * 0.06, duration: 0.62, ease: [0.22, 1, 0.36, 1] }}
        />
      ))}
      <motion.span
        className={styles.core}
        initial={reduceMotion ? false : { opacity: 0, scale: 0.82 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.7 }}
        transition={{ delay: 0.22, duration: 0.48, ease: [0.22, 1, 0.36, 1] }}
      >
        <VeloraBrandMark className={styles.mark} />
      </motion.span>
    </span>
  );
}

