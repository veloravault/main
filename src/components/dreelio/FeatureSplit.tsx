"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import shared from "@/app/dreelio/dreelio.module.css";
import styles from "./FeatureSplit.module.css";
import { PILL_ICONS } from "./icons";
import { ParallaxMedia } from "./ParallaxMedia";
import {
  HOVER_LIFT,
  LANDING_VIEWPORT,
  TAP_PRESS,
  revealVariants,
  staggerContainer,
  staggerItem,
} from "./motion";

type Props = {
  id?: string;
  eyebrow: string;
  title: React.ReactNode;
  body: React.ReactNode;
  pills: readonly string[];
  image: { src: string; alt: string; width: number; height: number };
  reverse?: boolean;
};

export function FeatureSplit({ id, eyebrow, title, body, pills, image, reverse }: Props) {
  const reduceMotion = useReducedMotion();
  const media = (
    <ParallaxMedia className={styles.frame} distance={12}>
      <div className={styles.card}>
        <Image
          src={image.src}
          alt={image.alt}
          width={image.width}
          height={image.height}
          sizes="(max-width: 900px) 100vw, 520px"
          className={styles.img}
        />
      </div>
    </ParallaxMedia>
  );

  const copy = (
    <motion.div
      className={styles.copy}
      variants={revealVariants(20)}
    >
      <motion.p className={shared.eyebrow} variants={staggerItem}>{eyebrow}</motion.p>
      <motion.h2 className={`${shared.h2} ${styles.title}`} variants={staggerItem}>{title}</motion.h2>
      <motion.p className={`${shared.lead} ${styles.body}`} variants={staggerItem}>{body}</motion.p>
      <motion.a
        href="#pricing"
        className={`${shared.btn} ${shared.btnDark} ${styles.cta}`}
        variants={staggerItem}
        whileHover={reduceMotion ? undefined : HOVER_LIFT}
        whileTap={reduceMotion ? undefined : TAP_PRESS}
      >
        Try Velora Vault free
      </motion.a>
      <motion.div className={styles.pills} variants={staggerContainer}>
        {pills.map((label) => {
          const Icon = PILL_ICONS[label as keyof typeof PILL_ICONS];
          return (
            <motion.span key={label} className={shared.featurePill} variants={staggerItem}>
              {Icon ? <Icon /> : null}
              {label}
            </motion.span>
          );
        })}
      </motion.div>
    </motion.div>
  );

  return (
    <motion.section
      id={id}
      className={`${shared.section} ${styles.section}`}
      initial={reduceMotion ? false : "hidden"}
      whileInView="show"
      viewport={LANDING_VIEWPORT}
    >
      <motion.div
        className={`${shared.container} ${styles.grid}`}
        data-reverse={reverse}
        variants={staggerContainer}
      >
        {reverse ? (
          <>
            {copy}
            {media}
          </>
        ) : (
          <>
            {media}
            {copy}
          </>
        )}
      </motion.div>
    </motion.section>
  );
}
