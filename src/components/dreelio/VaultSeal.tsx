"use client";

import { motion, useReducedMotion } from "framer-motion";
import { VeloraBrandMark } from "./VeloraBrand";
import styles from "./VaultSeal.module.css";

type VaultSealProps = {
  className?: string;
  compact?: boolean;
};

export function VaultSeal({ className, compact = false }: VaultSealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.span
      className={`${styles.seal} ${compact ? styles.compact : ""} ${className ?? ""}`}
      aria-hidden="true"
      initial={reduceMotion ? false : { opacity: 0, scale: 0.84 }}
      whileInView={reduceMotion ? undefined : { opacity: 1, scale: 1 }}
      viewport={{ once: true, amount: 0.7 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <VeloraBrandMark className={styles.mark} />
    </motion.span>
  );
}
