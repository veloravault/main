"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";
import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "framer-motion";
import styles from "@/app/landing.module.css";

const surfaces = [
  { label: "Passwords", detail: "••••••••", className: styles.passwordSurface },
  { label: "Documents", detail: "Archive.pdf", className: styles.documentSurface },
  { label: "Notes", detail: "Private note", className: styles.noteSurface },
  { label: "Financial", detail: "•••• 2486", className: styles.financeSurface },
];

const entryOffsets = [
  { x: -92, y: -74 },
  { x: 90, y: -64 },
  { x: -84, y: 72 },
  { x: 86, y: 78 },
];

export function VaultAperture() {
  const shouldReduceMotion = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { amount: 0.08 });
  const inViewRef = useRef(inView);
  const [openProgress, setOpenProgress] = useState(0);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 70%", "end 55%"],
  });

  useEffect(() => {
    inViewRef.current = inView;
  }, [inView]);

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    if (!inViewRef.current || shouldReduceMotion) return;
    setOpenProgress(Math.max(0, Math.min(1, latest)));
  });

  const progress = shouldReduceMotion ? 1 : openProgress;
  const apertureStyle = {
    "--aperture-progress": progress,
  } as CSSProperties;

  return (
    <section
      className={styles.apertureSection}
      ref={sectionRef}
      aria-labelledby="aperture-title"
    >
      <div className={styles.apertureIntro}>
        <p className={styles.sectionEyebrow}>One private place</p>
        <h2 id="aperture-title">Quietly collected. Carefully sealed.</h2>
        <p>
          The details you reach for every day come together in one calm,
          encrypted home.
        </p>
      </div>

      <motion.div
        className={styles.apertureStage}
        initial={shouldReduceMotion ? false : "rest"}
        whileInView="composed"
        viewport={{ once: true, amount: 0.3 }}
        variants={{
          rest: {},
          composed: { transition: { delayChildren: 0.12, staggerChildren: 0.11 } },
        }}
        style={apertureStyle}
      >
        <div className={styles.apertureHalo} aria-hidden="true" />

        {surfaces.map((surface, index) => (
          <motion.div
            className={`${styles.apertureSurface} ${surface.className}`}
            key={surface.label}
            variants={{
              rest: {
                x: entryOffsets[index].x,
                y: entryOffsets[index].y,
                opacity: 0,
                scale: 0.84,
              },
              composed: {
                x: 0,
                y: 0,
                opacity: 1,
                scale: 1,
                transition: { type: "spring", stiffness: 115, damping: 20 },
              },
            }}
          >
            <span>{surface.label}</span>
            <strong>{surface.detail}</strong>
          </motion.div>
        ))}

        <motion.div
          className={styles.apertureWindow}
          variants={{
            rest: { x: "-50%", y: "-50%", opacity: 0, scale: 0.88 },
            composed: {
              x: "-50%",
              y: "-50%",
              opacity: 1,
              scale: 1,
              transition: { type: "spring", stiffness: 135, damping: 22 },
            },
          }}
        >
          <div className={styles.apertureReveal}>
            <span className={styles.revealStatus}>
              <i /> Vault ready
            </span>
            <strong>Everything in its place.</strong>
            <small>Protected by your master key</small>
          </div>
          <div className={styles.apertureBlades} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} />
            ))}
          </div>
          <div className={styles.apertureHub} aria-hidden="true">
            <span />
          </div>
        </motion.div>

        <p className={styles.apertureCaption}>Scroll to open</p>
      </motion.div>
    </section>
  );
}
